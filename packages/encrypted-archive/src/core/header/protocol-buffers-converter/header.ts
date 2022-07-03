import { Header } from '../../../protocol-buffers/header_pb';
import { isArgon2Options } from '../../key-derivation-function/argon2';
import type { BuiltinInspectRecord } from '../../types/builtin';
import { cond, getPropFromValue } from '../../utils';
import { assertType } from '../../utils/type';
import type { HeaderData } from '../create';
import { createProtobufArgon2Options, parseProtobufArgon2Options } from './argon2Options';
import { createEnum2value, validateBytesField, validateNumberField } from './utils';

const dataName = 'Header data';

const {
    enum2value: cryptoAlgorithm2algorithmName,
    value2enum: algorithmName2cryptoAlgorithm,
} = createEnum2value<HeaderData['crypto']['algorithmName']>()(Header.CryptoAlgorithm)([
    [Header.CryptoAlgorithm.AES_256_GCM, 'aes-256-gcm'],
    [Header.CryptoAlgorithm.CHACHA20_POLY1305, 'chacha20-poly1305'],
]);

function getKeyDerivationOptions(
    builtin: BuiltinInspectRecord,
    header: Header,
    opts: { oneofFieldName: string; dataName: string },
): HeaderData['key']['keyDerivationFunctionOptions'] {
    const type = header.getKeyOptionsCase();
    if (type === Header.KeyOptionsCase.ARGON2_KEY_OPTIONS) {
        const keyOptions = header.getArgon2KeyOptions();
        if (!keyOptions) {
            throw new Error(`Could not read Argon2Options data from argon2_key_options field in ${opts.dataName}`);
        }
        return parseProtobufArgon2Options(builtin, keyOptions);
    }
    if (type === Header.KeyOptionsCase.KEY_OPTIONS_NOT_SET) {
        throw new Error(`There is no entry in the ${opts.oneofFieldName} oneof field in ${opts.dataName}`);
    }

    assertType<never>(type);
    throw new Error(
        `Unknown type received from ${opts.oneofFieldName} oneof field in ${opts.dataName}.`
            + ` Received: ${getPropFromValue(Header.KeyOptionsCase, type) ?? builtin.inspect(type)}`,
    );
}

const setKeyDerivationOptions = (
    builtin: BuiltinInspectRecord,
    header: Header,
    options: HeaderData['key']['keyDerivationFunctionOptions'],
): Header =>
    cond(options)
        .case(isArgon2Options, options => header.setArgon2KeyOptions(createProtobufArgon2Options(builtin, options)))
        .default((options: never) => {
            throw new Error(`Unknown keyDerivationOptions received: ${builtin.inspect(options)}`);
        });

const {
    enum2value: compressAlgorithm2CompressAlgorithmName,
    value2enum: compressAlgorithmName2CompressAlgorithm,
} = createEnum2value<HeaderData['compressAlgorithmName']>()(Header.CompressAlgorithm)([
    [Header.CompressAlgorithm.NONE, undefined],
    [Header.CompressAlgorithm.GZIP, 'gzip'],
    [Header.CompressAlgorithm.BROTLI, 'brotli'],
]);

export function createProtobufHeader(builtin: BuiltinInspectRecord, data: HeaderData): Header {
    return setKeyDerivationOptions(
        builtin,
        new Header()
            .setCryptoAlgorithm(algorithmName2cryptoAlgorithm(builtin, data.crypto.algorithmName))
            .setCryptoNonce(data.crypto.nonce)
            .setCryptoAuthTag(data.crypto.authTag)
            .setKeyLength(data.key.length)
            .setKeySalt(data.key.salt)
            .setCompressAlgorithm(compressAlgorithmName2CompressAlgorithm(builtin, data.compressAlgorithmName)),
        data.key.keyDerivationFunctionOptions,
    );
}

const validateBytesFromProtobuf = (fieldName: string, value: Uint8Array): Uint8Array =>
    validateBytesField(value, true, { fieldName, dataName });

export const parseProtobufHeader = (builtin: BuiltinInspectRecord, header: Header): HeaderData => ({
    crypto: {
        algorithmName: cryptoAlgorithm2algorithmName(
            builtin,
            header.getCryptoAlgorithm(),
            true,
            { fieldName: 'crypto_algorithm', dataName },
        ),
        nonce: validateBytesFromProtobuf('crypto_nonce', header.getCryptoNonce_asU8()),
        authTag: validateBytesFromProtobuf('crypto_auth_tag', header.getCryptoAuthTag_asU8()),
    },
    key: {
        length: validateNumberField(header.getKeyLength(), true, { fieldName: 'key_length', dataName }),
        salt: validateBytesFromProtobuf('key_salt', header.getKeySalt_asU8()),
        keyDerivationFunctionOptions: getKeyDerivationOptions(builtin, header, {
            oneofFieldName: 'key_options',
            dataName,
        }),
    },
    compressAlgorithmName: compressAlgorithm2CompressAlgorithmName(
        builtin,
        header.getCompressAlgorithm(),
        true,
        { fieldName: 'compress_algorithm', dataName },
    ),
});
