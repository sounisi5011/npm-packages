import { validateChunk } from '../errors';
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from '../types/builtin';
import { uint8arrayFrom } from '../utils';

export function convertChunk(builtin: BuiltinEncodeStringRecord & BuiltinInspectRecord) {
    return (chunk: unknown): Uint8Array => uint8arrayFrom(builtin.encodeString, validateChunk(builtin, chunk));
}
