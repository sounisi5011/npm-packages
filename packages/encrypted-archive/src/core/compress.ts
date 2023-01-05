import type { hasOwnProperty } from '@sounisi5011/ts-type-util-has-own-property';

import type { BuiltinInspectRecord } from './types/builtin';
import {
    BaseCompressOptions,
    CompressAlgorithmName,
    compressAlgorithmNameList,
    CompressionAlgorithmBuiltinAPI,
    CreateCompressorResult,
} from './types/compress';
import type { AsyncIterableReturn } from './types/utils';
import { passThroughString } from './utils';

function validateAlgorithmName(
    builtin: BuiltinInspectRecord,
    algorithmName: unknown,
): asserts algorithmName is CompressAlgorithmName {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!compressAlgorithmNameList.includes(algorithmName as any)) {
        throw new TypeError(
            `Unknown compress algorithm was received: ${passThroughString(builtin.inspect, algorithmName)}`,
        );
    }
}

function throwUnsupportedAlgorithmError(
    builtin: { compressionAlgorithm: CompressionAlgorithmBuiltinAPI },
    algorithmName: CompressAlgorithmName,
): never {
    const supportedAlgorithmMsg = compressAlgorithmNameList
        .filter(algorithmName => Boolean(builtin.compressionAlgorithm.algorithmRecord[algorithmName]))
        .map(algorithmName => `"${algorithmName}"`)
        .join(', ');
    throw new RangeError(
        'Unsupported compress algorithm was passed.'
            + ` Compression algorithm "${algorithmName}" is not supported on this environment; it should be one of ${supportedAlgorithmMsg}`,
    );
}

export function createCompressor<
    TCompressOptions extends BaseCompressOptions
>(
    builtin: { compressionAlgorithm: CompressionAlgorithmBuiltinAPI } & BuiltinInspectRecord,
    options: TCompressOptions | TCompressOptions['algorithm'] | undefined,
): CreateCompressorResult<TCompressOptions> {
    if (!options) {
        return {
            compressAlgorithmName: undefined,
            compressIterable: source => source,
        };
    }
    const compressOptions = (Object.prototype.hasOwnProperty.call as hasOwnProperty)(options, 'algorithm')
        ? options
        : { algorithm: options };
    const { algorithm } = compressOptions;
    validateAlgorithmName(builtin, algorithm);

    const result = builtin.compressionAlgorithm.tryCreateCompressor(compressOptions);
    if (!result) throwUnsupportedAlgorithmError(builtin, algorithm);

    return result;
}

export async function* decompressIterable(
    builtin: { compressionAlgorithm: CompressionAlgorithmBuiltinAPI } & BuiltinInspectRecord,
    algorithmName: CompressAlgorithmName,
    source: AsyncIterable<Uint8Array>,
): AsyncIterableReturn<Uint8Array, void> {
    validateAlgorithmName(builtin, algorithmName);

    const entry = builtin.compressionAlgorithm.algorithmRecord[algorithmName];
    if (!entry) throwUnsupportedAlgorithmError(builtin, algorithmName);

    yield* entry.decompress(source);
}
