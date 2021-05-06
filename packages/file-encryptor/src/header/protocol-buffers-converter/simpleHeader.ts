import type { SimpleHeaderData } from '../create';
import { Header } from '../protocol-buffers/header_pb';
import { validateBytesField } from './utils';

const dataName = 'SimpleHeader data';

export function createProtobufSimpleHeader(data: SimpleHeaderData): Header {
    return new Header()
        .setCryptNonce(data.nonce)
        .setCryptAuthTag(data.authTag);
}

export function parseProtobufSimpleHeader(header: Header): SimpleHeaderData {
    const cryptNonce = validateBytesField(
        header.getCryptNonce_asU8(),
        header.hasCryptNonce(),
        { fieldName: 'crypt_nonce', dataName },
    );
    const cryptAuthTag = validateBytesField(
        header.getCryptAuthTag_asU8(),
        header.hasCryptAuthTag(),
        { fieldName: 'crypt_auth_tag', dataName },
    );

    return {
        nonce: cryptNonce,
        authTag: cryptAuthTag,
    };
}
