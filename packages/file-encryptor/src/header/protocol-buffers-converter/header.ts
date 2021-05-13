import { isArgon2Options } from '../../key-derivation-function/argon2';
import { cond, getPropFromValue, printObject } from '../../utils';
import { assertType } from '../../utils/type';
import type { HeaderData } from '../create';
import { Header } from '../protocol-buffers/header_pb';
import { createProtobufArgon2Options, parseProtobufArgon2Options } from './argon2Options';
import { createEnum2value, validateBytesField, validateNumberField } from './utils';

const dataName = 'Header data';

const {
    enum2value: cryptoAlgorithm2algorithmName,
    value2enum: algorithmName2cryptoAlgorithm,
} = createEnum2value<HeaderData['algorithmName']>()(Header.CryptoAlgorithm)([
    [Header.CryptoAlgorithm.AES_256_GCM, 'aes-256-gcm'],
    [Header.CryptoAlgorithm.CHACHA20_POLY1305, 'chacha20-poly1305'],
]);

function getKeyDerivationOptions(
    header: Header,
    opts: { oneofFieldName: string; dataName: string },
): HeaderData['keyDerivationOptions'] {
    const type = header.getKeyOptionsCase();
    if (type === Header.KeyOptionsCase.ARGON2_KEY_OPTIONS) {
        const keyOptions = header.getArgon2KeyOptions();
        if (!keyOptions) {
            throw new Error(`Could not read Argon2Options data from argon2_key_options field in ${opts.dataName}`);
        }
        return parseProtobufArgon2Options(keyOptions);
    }
    if (type === Header.KeyOptionsCase.KEY_OPTIONS_NOT_SET) {
        throw new Error(`There is no entry in the ${opts.oneofFieldName} oneof field in ${opts.dataName}`);
    }

    assertType<never>(type);
    throw new Error(
        `Unknown type received from ${opts.oneofFieldName} oneof field in ${opts.dataName}.`
            + ` Received: ${getPropFromValue(Header.KeyOptionsCase, type) ?? printObject(type)}`,
    );
}

const setKeyDerivationOptions = (header: Header, options: HeaderData['keyDerivationOptions']): Header =>
    cond(options)
        .case(isArgon2Options, options => header.setArgon2KeyOptions(createProtobufArgon2Options(options)))
        .default((options: never) => {
            throw new Error(`Unknown keyDerivationOptions received: ${printObject(options)}`);
        });

const {
    enum2value: compressAlgorithm2CompressAlgorithmName,
    value2enum: compressAlgorithmName2CompressAlgorithm,
} = createEnum2value<HeaderData['compressAlgorithmName']>()(Header.CompressAlgorithm)([
    [Header.CompressAlgorithm.NONE, undefined],
    [Header.CompressAlgorithm.GZIP, 'gzip'],
    [Header.CompressAlgorithm.BROTLI, 'brotli'],
]);

export function createProtobufHeader(data: HeaderData): Header {
    return setKeyDerivationOptions(
        new Header()
            .setCryptoNonce(data.nonce)
            .setCryptoAuthTag(data.authTag)
            .setCryptoAlgorithm(algorithmName2cryptoAlgorithm(data.algorithmName))
            .setKeySalt(data.salt)
            .setKeyLength(data.keyLength)
            .setCompressAlgorithm(compressAlgorithmName2CompressAlgorithm(data.compressAlgorithmName)),
        data.keyDerivationOptions,
    );
}

export function parseProtobufHeader(header: Header): HeaderData {
    return {
        algorithmName: cryptoAlgorithm2algorithmName(
            header.getCryptoAlgorithm(),
            header.hasCryptoAlgorithm(),
            { fieldName: 'crypto_algorithm', dataName },
        ),
        salt: validateBytesField(
            header.getKeySalt_asU8(),
            header.hasKeySalt(),
            { fieldName: 'key_salt', dataName },
        ),
        keyLength: validateNumberField(
            header.getKeyLength(),
            header.hasKeyLength(),
            { fieldName: 'key_length', dataName },
        ),
        keyDerivationOptions: getKeyDerivationOptions(
            header,
            { oneofFieldName: 'key_options', dataName },
        ),
        nonce: validateBytesField(
            header.getCryptoNonce_asU8(),
            header.hasCryptoNonce(),
            { fieldName: 'crypto_nonce', dataName },
        ),
        authTag: validateBytesField(
            header.getCryptoAuthTag_asU8(),
            header.hasCryptoAuthTag(),
            { fieldName: 'crypto_auth_tag', dataName },
        ),
        compressAlgorithmName: compressAlgorithm2CompressAlgorithmName(
            header.getCompressAlgorithm(),
            header.hasCompressAlgorithm(),
            { fieldName: 'compress_algorithm', dataName },
        ),
    };
}
