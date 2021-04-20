import type { flatbuffers } from 'flatbuffers';

import type { SimpleHeaderData } from '../create';
import { SimpleHeader } from './header_generated';

export function createFbsSimpleHeaderTable(builder: flatbuffers.Builder, data: SimpleHeaderData): flatbuffers.Offset {
    /**
     * Create crypt_nonce
     */
    const cryptNonceOffset = SimpleHeader.createCryptNonceVector(builder, data.nonce);

    /**
     * Create crypt_auth_tag
     */
    const cryptAuthTagOffset = SimpleHeader.createCryptAuthTagVector(builder, data.authTag);

    /**
     * Create SimpleHeader table
     */
    const offset = SimpleHeader.create(
        builder,
        cryptNonceOffset,
        cryptAuthTagOffset,
    );
    return offset;
}

export function parseFbsSimpleHeaderTable(header: SimpleHeader): SimpleHeaderData {
    const cryptNonce = header.cryptNonceArray();
    if (!cryptNonce) throw new Error(`crypt_nonce field in SimpleHeader table is not defined`);

    const cryptAuthTag = header.cryptAuthTagArray();
    if (!cryptAuthTag) throw new Error(`crypt_auth_tag field in SimpleHeader table is not defined`);

    const simpleHeaderData: SimpleHeaderData = {
        nonce: cryptNonce,
        authTag: cryptAuthTag,
    };
    return simpleHeaderData;
}
