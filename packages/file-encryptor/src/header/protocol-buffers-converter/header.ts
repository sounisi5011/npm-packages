import { isArgon2Options } from '../../key-derivation-function/argon2';
import { getPropFromValue, printObject } from '../../utils';
import { assertType } from '../../utils/type';
import type { HeaderData } from '../create';
import { Header } from '../protocol-buffers/header_pb';
import { createProtobufArgon2Options, parseProtobufArgon2Options } from './argon2Options';
import { createEnum2value, validateBytesField, validateNumberField } from './utils';

const dataName = 'Header data';

const {
    enum2value: cryptAlgorithm2algorithmName,
    value2enum: algorithmName2cryptAlgorithm,
} = createEnum2value<HeaderData['algorithmName']>()(Header.CryptAlgorithm)([
    [Header.CryptAlgorithm.AES_256_GCM, 'aes-256-gcm'],
    [Header.CryptAlgorithm.CHACHA20_POLY1305, 'chacha20-poly1305'],
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

function setKeyDerivationOptions(header: Header, options: HeaderData['keyDerivationOptions']): Header {
    if (isArgon2Options(options)) return header.setArgon2KeyOptions(createProtobufArgon2Options(options));

    assertType<never>(options);
    throw new Error(`Unknown keyDerivationOptions received: ${printObject(options)}`);
}

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
            .setCryptNonce(data.nonce)
            .setCryptAuthTag(data.authTag)
            .setCryptAlgorithm(algorithmName2cryptAlgorithm(data.algorithmName))
            .setKeySalt(data.salt)
            .setKeyLength(data.keyLength)
            .setCompressAlgorithm(compressAlgorithmName2CompressAlgorithm(data.compressAlgorithmName)),
        data.keyDerivationOptions,
    );
}

export function parseProtobufHeader(header: Header): HeaderData {
    return {
        algorithmName: cryptAlgorithm2algorithmName(
            header.getCryptAlgorithm(),
            header.hasCryptAlgorithm(),
            { fieldName: 'crypt_algorithm', dataName },
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
            header.getCryptNonce_asU8(),
            header.hasCryptNonce(),
            { fieldName: 'crypt_nonce', dataName },
        ),
        authTag: validateBytesField(
            header.getCryptAuthTag_asU8(),
            header.hasCryptAuthTag(),
            { fieldName: 'crypt_auth_tag', dataName },
        ),
        compressAlgorithmName: compressAlgorithm2CompressAlgorithmName(
            header.getCompressAlgorithm(),
            header.hasCompressAlgorithm(),
            { fieldName: 'compress_algorithm', dataName },
        ),
    };
}
