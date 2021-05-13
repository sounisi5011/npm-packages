import { CryptoAlgorithm, cryptoAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompressGenerator } from './compress';
import {
    HeaderData,
    parseCiphertextGenerator,
    parseCiphertextLength,
    parseHeaderData,
    parseHeaderLength,
    parseSimpleHeaderData,
    parseSimpleHeaderLength,
    SimpleHeaderData,
    validateCID,
} from './header';
import { getKDF } from './key-derivation-function';
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { InputDataType } from './types';
import { bufferFrom, fixNodePrimordialsErrorInstance } from './utils';
import { StreamReader } from './utils/stream';

interface DecryptorMetadata {
    algorithm: CryptoAlgorithm;
    key: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

async function getAlgorithmAndKey(
    password: InputDataType,
    headerData: HeaderData,
): Promise<{ algorithm: CryptoAlgorithm; key: Uint8Array }> {
    const algorithm = cryptoAlgorithmMap.get(headerData.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${headerData.algorithmName}`);
    }

    /**
     * Generate key
     */
    const key = await getKDF(headerData.keyDerivationOptions)
        .deriveKey(
            password,
            headerData.salt,
            headerData.keyLength,
        );

    return { algorithm, key };
}

async function parseHeader(
    password: InputDataType,
    reader: StreamReader,
    prevDecryptorMetadata: DecryptorMetadata | undefined,
): Promise<{ headerData: HeaderData | SimpleHeaderData; decryptorMetadata: DecryptorMetadata }> {
    if (!prevDecryptorMetadata) {
        /**
         * Validate CID (Content IDentifier)
         */
        await validateCID(reader);

        /**
         * Parse header
         */
        const { dataByteLength: headerByteLength } = await parseHeaderLength(reader);
        const { headerData } = await parseHeaderData(reader, { headerByteLength });

        /**
         * Read algorithm and generate key
         */
        const { algorithm, key } = await getAlgorithmAndKey(password, headerData);

        return {
            headerData,
            decryptorMetadata: {
                algorithm,
                key,
                compressAlgorithmName: headerData.compressAlgorithmName,
            },
        };
    } else {
        /**
         * Parse simple header
         */
        const { dataByteLength: headerByteLength } = await parseSimpleHeaderLength(reader);
        const { headerData } = await parseSimpleHeaderData(reader, { headerByteLength });
        return {
            headerData,
            decryptorMetadata: prevDecryptorMetadata,
        };
    }
}

async function* decrypt(
    ciphertext: Iterable<Uint8Array> | AsyncIterable<Uint8Array>,
    { algorithm, key, nonce, authTag }: {
        algorithm: CryptoAlgorithm;
        key: Uint8Array;
        nonce: Uint8Array;
        authTag: Uint8Array;
    },
): AsyncGenerator<Buffer, void> {
    try {
        const decipher = algorithm.createDecipher(key, nonce);
        decipher.setAuthTag(authTag);
        for await (const ciphertextChunk of ciphertext) {
            yield decipher.update(ciphertextChunk);
        }
        yield decipher.final();
    } catch (error) {
        fixNodePrimordialsErrorInstance(error);
    }
}

async function* decryptChunk(
    password: InputDataType,
    prevDecryptorMetadata: DecryptorMetadata | undefined,
    reader: StreamReader,
): AsyncGenerator<Buffer, DecryptorMetadata> {
    /**
     * Parse header
     */
    const { headerData, decryptorMetadata } = await parseHeader(
        password,
        reader,
        prevDecryptorMetadata,
    );

    /**
     * Read ciphertext
     */
    const { dataByteLength: ciphertextByteLength } = await parseCiphertextLength(reader);
    const ciphertextDataGenerator = parseCiphertextGenerator(reader, { ciphertextByteLength });

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(headerData.nonce);

    /**
     * Decrypt ciphertext
     */
    const compressedCleartextGenerator = decrypt(ciphertextDataGenerator, {
        algorithm: decryptorMetadata.algorithm,
        key: decryptorMetadata.key,
        nonce: headerData.nonce,
        authTag: headerData.authTag,
    });

    /**
     * Decompress cleartext
     */
    yield* decryptorMetadata.compressAlgorithmName
        ? decompressGenerator(compressedCleartextGenerator, decryptorMetadata.compressAlgorithmName)
        : compressedCleartextGenerator;

    return decryptorMetadata;
}

export function createDecryptorGenerator(password: InputDataType) {
    return async function* decryptor(
        source: Iterable<InputDataType> | AsyncIterable<InputDataType>,
    ): AsyncGenerator<Buffer, void, unknown> {
        const reader = new StreamReader(source, chunk => {
            validateChunk(chunk);
            return bufferFrom(chunk, 'utf8');
        });

        let decryptorMetadata: DecryptorMetadata | undefined;
        while (!(await reader.isEnd())) {
            decryptorMetadata = yield* decryptChunk(password, decryptorMetadata, reader);
        }
    };
}
