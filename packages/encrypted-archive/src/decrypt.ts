import { CryptoAlgorithm, cryptoAlgorithmMap } from './cipher';
import { CompressOptions, decompressIterable } from './compress';
import { validateChunk, validatePassword } from './errors';
import {
    HeaderData,
    parseCiphertextIterable,
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
import type { InputDataType, IteratorConverter } from './types';
import { bufferFrom, fixNodePrimordialsErrorInstance } from './utils';
import { StreamReader } from './utils/stream';
import type { AsyncIterableReturn } from './utils/type';

interface DecryptorMetadata {
    algorithm: CryptoAlgorithm;
    key: Uint8Array;
    nonce: Uint8Array | Buffer;
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
}

async function getAlgorithmAndKey(
    password: InputDataType,
    headerData: HeaderData,
): Promise<{ algorithm: CryptoAlgorithm; key: Uint8Array }> {
    const algorithm = cryptoAlgorithmMap.get(headerData.crypto.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${headerData.crypto.algorithmName}`);
    }

    /**
     * Generate key
     */
    const key = await getKDF(headerData.key.keyDerivationFunctionOptions)
        .deriveKey(
            password,
            headerData.key.salt,
            headerData.key.length,
        );

    return { algorithm, key };
}

function createNonceFromDiff(
    nonceDiff: SimpleHeaderData['crypto']['nonceDiff'],
    prevNonce: Buffer | Uint8Array,
): Buffer | Uint8Array {
    if ('addFixed' in nonceDiff) {
        return nonceState.createFromFixedFieldDiff(
            prevNonce,
            nonceDiff.addFixed,
            nonceDiff.resetCounter,
        );
    } else {
        return nonceState.createFromInvocationCountDiff(
            prevNonce,
            nonceDiff.addCounter,
        );
    }
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
                nonce: headerData.crypto.nonce,
                compressAlgorithmName: headerData.compressAlgorithmName,
            },
        };
    } else {
        /**
         * Parse simple header
         */
        const { dataByteLength: headerByteLength } = await parseSimpleHeaderLength(reader);
        const { headerData } = await parseSimpleHeaderData(reader, { headerByteLength });
        const nonce = createNonceFromDiff(headerData.crypto.nonceDiff, prevDecryptorMetadata.nonce);
        return {
            headerData,
            decryptorMetadata: { ...prevDecryptorMetadata, nonce },
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
): AsyncIterableReturn<Buffer, void> {
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

async function decryptChunk(
    password: InputDataType,
    reader: StreamReader,
    prevDecryptorMetadata?: DecryptorMetadata,
): Promise<{ compressedCleartextIterable: AsyncIterableReturn<Buffer, void>; decryptorMetadata: DecryptorMetadata }> {
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
    const ciphertextDataIterable = parseCiphertextIterable(reader, { ciphertextByteLength });

    /**
     * Decrypt ciphertext
     */
    const compressedCleartextIterable = decrypt(ciphertextDataIterable, {
        algorithm: decryptorMetadata.algorithm,
        key: decryptorMetadata.key,
        nonce: decryptorMetadata.nonce,
        authTag: headerData.crypto.authTag,
    });

    return {
        compressedCleartextIterable,
        decryptorMetadata,
    };
}

export function createDecryptorIterator(password: InputDataType): IteratorConverter {
    validatePassword(password);
    return async function* decryptor(source) {
        const reader = new StreamReader(source, chunk => bufferFrom(validateChunk(chunk), 'utf8'));

        const {
            compressedCleartextIterable: firstChunkCompressedCleartextIterable,
            decryptorMetadata,
        } = await decryptChunk(password, reader);
        const compressedCleartextIterable = async function*() {
            yield* firstChunkCompressedCleartextIterable;
            let prevDecryptorMetadata = decryptorMetadata;
            while (!(await reader.isEnd())) {
                const { compressedCleartextIterable, decryptorMetadata: newDecryptorMetadata } = await decryptChunk(
                    password,
                    reader,
                    prevDecryptorMetadata,
                );
                yield* compressedCleartextIterable;
                prevDecryptorMetadata = newDecryptorMetadata;
            }
        }();

        /**
         * Decompress cleartext
         */
        yield* decryptorMetadata.compressAlgorithmName
            ? decompressIterable(compressedCleartextIterable, decryptorMetadata.compressAlgorithmName)
            : compressedCleartextIterable;
    };
}
