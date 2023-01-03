import { once } from 'events';
import type * as stream from 'stream';

export function validateDisallowedOptions(
    options: Record<PropertyKey, unknown>,
    disallowOptionNameList: readonly PropertyKey[],
    errorMessage = `The following compress options are not allowed: %s`,
): void {
    const disallowOptionList = disallowOptionNameList.filter(optName => optName in options);
    if (disallowOptionList.length > 0) {
        throw new Error(errorMessage.replace(/%s/g, disallowOptionList.join(', ')));
    }
}

/**
 * Writes a value of type `Iterable` to a writable stream object.
 * Inspired by the `stream.pipeline()` module method in Node.js v13.10.0 and later (which adds support for async generators).
 */
export function writeFromIterableToStream<TStream extends stream.Writable>(
    iterable: Iterable<unknown> | AsyncIterable<unknown>,
    stream: TStream,
): TStream {
    void (async () => {
        try {
            /**
             * @see https://github.com/nodejs/node/blob/v13.14.0/lib/internal/streams/pipeline.js#L132-L150
             * @see https://github.com/nodejs/node/blob/v14.17.0/lib/internal/streams/pipeline.js#L119-L141
             * @see https://github.com/nodejs/node/blob/v15.14.0/lib/internal/streams/pipeline.js#L105-L127
             * @see https://github.com/nodejs/node/blob/v16.1.0/lib/internal/streams/pipeline.js#L104-L126
             */
            // @ts-expect-error TS2339: Property 'writableNeedDrain' does not exist on type 'TStream'.
            // Note: The "writableNeedDrain" property was added in Node.js v14.17.0.
            if (stream.writableNeedDrain === true) {
                await once(stream, 'drain');
            }
            for await (const chunk of iterable) {
                if (!stream.write(chunk)) {
                    if (stream.destroyed) return;
                    await once(stream, 'drain');
                }
            }
            stream.end();
        } catch (error) {
            /**
             * @see https://github.com/nodejs/node/blob/v13.14.0/lib/internal/streams/destroy.js#L136-L142
             * @see https://github.com/nodejs/node/blob/v14.17.0/lib/internal/streams/destroy.js#L178-L183
             * @see https://github.com/nodejs/node/blob/v15.14.0/lib/internal/streams/destroy.js#L362-L367
             * @see https://github.com/nodejs/node/blob/v16.1.0/lib/internal/streams/destroy.js#L367-L372
             *
             * Note: We should probably verify that error is an instance of the Error object,
             *       but the Node.js source code doesn't do that check.
             */
            stream.destroy(error as Error);
        }
    })();
    return stream;
}
