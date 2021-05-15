import type { SimpleHeaderData } from '../create';
import { SimpleHeader } from '../protocol-buffers/header_pb';
import { validateBytesField, validateNumberFieldInRange, validateNumberOptionInRange } from './utils';

const dataName = 'SimpleHeader data';
const MAX_UINT64 = BigInt(2) ** BigInt(64) - BigInt(1);

export function createProtobufSimpleHeader(simpleHeaderData: SimpleHeaderData): SimpleHeader {
    const header = new SimpleHeader()
        .setCryptoAuthTag(simpleHeaderData.authTag);

    const { nonce } = simpleHeaderData;
    if ('addCounter' in nonce) {
        header.setCryptoNonceCounterAddOrReset(String(
            validateNumberOptionInRange(
                nonce.addCounter,
                { min: 1, max: MAX_UINT64 },
                { paramName: `simpleHeaderData.nonce.addCounter` },
            ) - BigInt(1),
        ));
    } else {
        header.setCryptoNonceFixedAdd(String(
            validateNumberOptionInRange(
                nonce.addFixed,
                { min: 1, max: MAX_UINT64 },
                { paramName: `simpleHeaderData.nonce.addFixed` },
            ),
        ));
        header.setCryptoNonceCounterAddOrReset(String(
            validateNumberOptionInRange(
                nonce.resetCounter,
                { min: 0, max: MAX_UINT64 },
                { paramName: `simpleHeaderData.nonce.resetCounter` },
            ),
        ));
    }

    return header;
}

export function parseProtobufSimpleHeader(header: SimpleHeader): SimpleHeaderData {
    const cryptoAuthTag = validateBytesField(
        header.getCryptoAuthTag_asU8(),
        header.hasCryptoAuthTag(),
        { fieldName: 'crypto_auth_tag', dataName },
    );
    const cryptoNonceCounterAddOrReset = BigInt(header.getCryptoNonceCounterAddOrReset());
    const cryptoNonceFixedAdd = validateNumberFieldInRange(
        BigInt(header.getCryptoNonceFixedAdd()),
        { min: 0, max: MAX_UINT64 },
        { fieldName: 'crypto_nonce_fixed_add', dataName },
    );

    if (cryptoNonceFixedAdd > 0) {
        const cryptoNonceCounterReset = validateNumberFieldInRange(
            cryptoNonceCounterAddOrReset,
            { min: 0, max: MAX_UINT64 },
            { fieldName: 'crypto_nonce_counter_add_or_reset', dataName },
        );
        return {
            authTag: cryptoAuthTag,
            nonce: {
                addFixed: cryptoNonceFixedAdd,
                resetCounter: cryptoNonceCounterReset,
            },
        };
    } else {
        const cryptoNonceCounterAdd = validateNumberFieldInRange(
            cryptoNonceCounterAddOrReset,
            { min: 0, max: MAX_UINT64 - BigInt(1) },
            { fieldName: 'crypto_nonce_counter_add_or_reset', dataName },
        );
        return {
            authTag: cryptoAuthTag,
            nonce: {
                addCounter: cryptoNonceCounterAdd + BigInt(1),
            },
        };
    }
}
