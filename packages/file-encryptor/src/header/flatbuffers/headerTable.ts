import type { flatbuffers } from 'flatbuffers';

import { isArgon2Options } from '../../key-derivation-function/argon2';
import { getPropFromValue, printObject } from '../../utils';
import { assertType } from '../../utils/type';
import type { HeaderData } from '../create';
import { createFbsArgon2OptionsTable, parseFbsArgon2OptionsTable } from './argon2OptionsTable';
import { Argon2Options, CompressAlgorithm, CryptAlgorithm, Header, KeyOptions } from './header_generated';

function algorithmName2cryptAlgorithm(algorithmName: HeaderData['algorithmName']): CryptAlgorithm {
    if (algorithmName === 'aes-256-gcm') return CryptAlgorithm.AES_256_GCM;
    if (algorithmName === 'chacha20-poly1305') return CryptAlgorithm.ChaCha20_Poly1305;

    assertType<never>(algorithmName);
    throw new Error(`Unknown algorithmName received: ${printObject(algorithmName)}`);
}

function cryptAlgorithm2algorithmName(cryptAlgorithm: CryptAlgorithm): HeaderData['algorithmName'] {
    if (cryptAlgorithm === CryptAlgorithm.AES_256_GCM) return 'aes-256-gcm';
    if (cryptAlgorithm === CryptAlgorithm.ChaCha20_Poly1305) return 'chacha20-poly1305';

    assertType<never>(cryptAlgorithm);
    throw new Error(
        `The value in the crypt_algorithm field in the Header table is unknown. Received: ${getPropFromValue(
            CryptAlgorithm,
            cryptAlgorithm,
        ) ?? printObject(cryptAlgorithm)}`,
    );
}

function compressAlgorithmName2CompressAlgorithm(
    compressAlgorithmName: HeaderData['compressAlgorithmName'],
): CompressAlgorithm {
    if (compressAlgorithmName === undefined) return CompressAlgorithm.None;
    if (compressAlgorithmName === 'gzip') return CompressAlgorithm.Gzip;
    if (compressAlgorithmName === 'brotli') return CompressAlgorithm.Brotli;

    assertType<never>(compressAlgorithmName);
    throw new Error(`Unknown compressAlgorithmName received: ${printObject(compressAlgorithmName)}`);
}

function compressAlgorithm2CompressAlgorithmName(
    compressAlgorithm: CompressAlgorithm,
): HeaderData['compressAlgorithmName'] {
    if (compressAlgorithm === CompressAlgorithm.None) return undefined;
    if (compressAlgorithm === CompressAlgorithm.Gzip) return 'gzip';
    if (compressAlgorithm === CompressAlgorithm.Brotli) return 'brotli';

    assertType<never>(compressAlgorithm);
    throw new Error(
        `The value in the compress_algorithm field in the Header table is unknown. Received: ${getPropFromValue(
            CompressAlgorithm,
            compressAlgorithm,
        ) ?? printObject(compressAlgorithm)}`,
    );
}

function keyDerivationOptions2KeyOptions(
    builder: flatbuffers.Builder,
    options: HeaderData['keyDerivationOptions'],
): { type: KeyOptions; offset: flatbuffers.Offset } {
    if (isArgon2Options(options)) {
        return {
            type: KeyOptions.Argon2Options,
            offset: createFbsArgon2OptionsTable(builder, options),
        };
    }

    assertType<never>(options);
    throw new Error(`Unknown keyDerivationOptions received: ${printObject(options)}`);
}

function getKeyDerivationOptions(header: Header): HeaderData['keyDerivationOptions'] {
    const type = header.keyOptionsType();
    if (type === KeyOptions.Argon2Options) {
        const table = header.keyOptions(new Argon2Options());
        if (!table) throw new Error(`Could not read Argon2Options table from key_options field in Header table`);
        return parseFbsArgon2OptionsTable(table);
    }
    if (type === KeyOptions.NONE) {
        throw new Error(`There is no entry in the KeyOptions union received from key_options field in Header table`);
    }

    assertType<never>(type);
    throw new Error(`Unknown type received from key_options field in Header table`);
}

export function createFbsHeaderTable(builder: flatbuffers.Builder, data: HeaderData): flatbuffers.Offset {
    /**
     * Create key_salt
     */
    const keySaltOffset = Header.createKeySaltVector(builder, data.salt);

    /**
      * Create crypt_nonce
      */
    const cryptNonceOffset = Header.createCryptNonceVector(builder, data.nonce);

    /**
      * Create crypt_auth_tag
      */
    const cryptAuthTagOffset = Header.createCryptAuthTagVector(builder, data.authTag);

    /**
      * Create key_options
      */
    const { type: keyOptionsType, offset: keyOptionsOffset } = keyDerivationOptions2KeyOptions(
        builder,
        data.keyDerivationOptions,
    );

    /**
      * Create Header table
      */
    const offset = Header.create(
        builder,
        algorithmName2cryptAlgorithm(data.algorithmName),
        keySaltOffset,
        data.keyLength,
        keyOptionsType,
        keyOptionsOffset,
        cryptNonceOffset,
        cryptAuthTagOffset,
        compressAlgorithmName2CompressAlgorithm(data.compressAlgorithmName),
    );
    return offset;
}

export function parseFbsHeaderTable(header: Header): HeaderData {
    const keySalt = header.keySaltArray();
    if (!keySalt) throw new Error(`key_salt field in Header table is not defined`);

    const keyOptions = getKeyDerivationOptions(header);

    const cryptNonce = header.cryptNonceArray();
    if (!cryptNonce) throw new Error(`crypt_nonce field in Header table is not defined`);

    const cryptAuthTag = header.cryptAuthTagArray();
    if (!cryptAuthTag) throw new Error(`crypt_auth_tag field in Header table is not defined`);

    const headerData: HeaderData = {
        algorithmName: cryptAlgorithm2algorithmName(header.cryptAlgorithm()),
        salt: keySalt,
        keyLength: header.keyLength(),
        keyDerivationOptions: keyOptions,
        nonce: cryptNonce,
        authTag: cryptAuthTag,
        compressAlgorithmName: compressAlgorithm2CompressAlgorithmName(header.compressAlgorithm()),
    };
    return headerData;
}
