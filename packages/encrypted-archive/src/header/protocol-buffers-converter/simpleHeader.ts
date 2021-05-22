import type { SimpleHeaderData } from '../create';
import { SimpleHeader } from '../protocol-buffers/header_pb';
import { validateBytesField, validateNumberFieldInRange, validateNumberOptionInRange } from './utils';

const dataName = 'SimpleHeader data';
const MAX_UINT64 = BigInt(2) ** BigInt(64) - BigInt(1);

export function createProtobufSimpleHeader(simpleHeaderData: SimpleHeaderData): SimpleHeader {
    const header = new SimpleHeader()
        .setCryptoAuthTag(simpleHeaderData.crypto.authTag);

    const { nonceDiff } = simpleHeaderData.crypto;
    const validateNonceInput = (paramName: string, value: bigint, min: number): bigint =>
        validateNumberOptionInRange(
            value,
            { min, max: MAX_UINT64 },
            { paramName: `simpleHeaderData.crypto.nonceDiff.${paramName}` },
        );
    if ('addCounter' in nonceDiff) {
        header.setCryptoNonceCounterAddOrReset(String(
            validateNonceInput('addCounter', nonceDiff.addCounter, 1) - BigInt(1),
        ));
    } else {
        header.setCryptoNonceFixedAdd(String(
            validateNonceInput('addFixed', nonceDiff.addFixed, 1),
        ));
        header.setCryptoNonceCounterAddOrReset(String(
            validateNonceInput('resetCounter', nonceDiff.resetCounter, 0),
        ));
    }

    return header;
}

const validateUInt64FromProtobuf = (fieldName: string, value: string, max: bigint = MAX_UINT64): bigint =>
    validateNumberFieldInRange(
        BigInt(value),
        { min: 0, max },
        { fieldName, dataName },
    );

export function parseProtobufSimpleHeader(header: SimpleHeader): SimpleHeaderData {
    const authTag = validateBytesField(
        header.getCryptoAuthTag_asU8(),
        true,
        { fieldName: 'crypto_auth_tag', dataName },
    );
    const cryptoNonceCounterAddOrReset = (max: bigint): bigint =>
        validateUInt64FromProtobuf(
            'crypto_nonce_counter_add_or_reset',
            header.getCryptoNonceCounterAddOrReset(),
            max,
        );
    const cryptoNonceFixedAdd = validateUInt64FromProtobuf(
        'crypto_nonce_fixed_add',
        header.getCryptoNonceFixedAdd(),
    );

    const nonceDiff = cryptoNonceFixedAdd > 0
        ? {
            addFixed: cryptoNonceFixedAdd,
            resetCounter: cryptoNonceCounterAddOrReset(MAX_UINT64),
        }
        : {
            addCounter: cryptoNonceCounterAddOrReset(MAX_UINT64 - BigInt(1)) + BigInt(1),
        };

    return { crypto: { authTag, nonceDiff } };
}
