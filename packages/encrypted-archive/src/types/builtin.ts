/**
 * Convert a string to an ArrayBufferView or ArrayBuffer.
 * @see https://nodejs.org/api/buffer.html#static-method-bufferfromstring-encoding
 * @see https://encoding.spec.whatwg.org/#interface-textencoder
 * @see https://developer.mozilla.org/docs/Web/API/TextEncoder
 * @see https://doc.deno.land/deno/stable/~/TextEncoder#encode
 */
export type EncodeStringFn = (input: string) => ArrayBufferView | ArrayBufferLike;

/**
 * Takes a value and converts to a human readable string.
 * The string is a single line.
 * This is used to display the value in error messages.
 * @see https://nodejs.org/api/util.html#utilinspectobject-options
 * @see https://doc.deno.land/deno/stable/~/Deno.inspect
 */
export type InspectFn = (value: unknown) => string;

export interface BuiltinInspectRecord {
    readonly inspect: InspectFn;
}
