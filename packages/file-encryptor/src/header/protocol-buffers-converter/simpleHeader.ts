import type { SimpleHeaderData } from '../create';
import { Header } from '../protocol-buffers/header_pb';
import { validateBytesField } from './utils';

const dataName = 'SimpleHeader data';

export function createProtobufSimpleHeader(data: SimpleHeaderData): Header {
    return new Header()
        .setCryptoNonce(data.nonce)
        .setCryptoAuthTag(data.authTag);
}

export function parseProtobufSimpleHeader(header: Header): SimpleHeaderData {
    const cryptoNonce = validateBytesField(
        header.getCryptoNonce_asU8(),
        header.hasCryptoNonce(),
        { fieldName: 'crypto_nonce', dataName },
    );
    const cryptoAuthTag = validateBytesField(
        header.getCryptoAuthTag_asU8(),
        header.hasCryptoAuthTag(),
        { fieldName: 'crypto_auth_tag', dataName },
    );

    return {
        nonce: cryptoNonce,
        authTag: cryptoAuthTag,
    };
}
