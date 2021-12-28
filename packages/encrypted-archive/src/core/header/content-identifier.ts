import { encode as varintEncode } from 'varint';

/**
 * @see https://github.com/multiformats/multicodec/blob/909e183da65818ecd1e672904980e53711da8780/README.md#private-use-area
 */
export const cidNumber = 0x305011;

export const cidByteList = varintEncode(cidNumber);
