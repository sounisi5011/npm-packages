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
import { nonceState } from './nonce';
import { validateChunk } from './stream';
import type { EncodeStringFn, InputDataType, IteratorConverter } from './types';
import type { CompressOptions, DecompressIterable } from './types/compress';
import type { CryptoAlgorithmData, GetCryptoAlgorithm } from './types/crypto';
import type { GetKDF } from './types/key-derivation-function';
import type { AsyncIterableReturn } from './types/utils';
import { uint8arrayFrom } from './utils';
import { StreamReader } from './utils/stream';

interface DecryptAlgorithmAndKeyAPIRecord {
    encodeString: EncodeStringFn;
    getKDF: GetKDF;
    getCryptoAlgorithm: GetCryptoAlgorithm;
}

export interface DecryptBuiltinAPIRecord extends DecryptAlgorithmAndKeyAPIRecord {
    decompressIterable: DecompressIterable;
}

interface DecryptorMetadata {
    algorithm: CryptoAlgorithmData;
    key: Uint8Array;
    nonce: Uint8Array;
    compressAlgorithmName: CompressOptions['algorithm'] | undefined;
}

async function getAlgorithmAndKey(
    builtin: DecryptAlgorithmAndKeyAPIRecord,
    password: InputDataType,
    headerData: HeaderData,
): Promise<{ algorithm: CryptoAlgorithmData; key: Uint8Array }> {
    const algorithm = builtin.getCryptoAlgorithm(headerData.crypto.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${headerData.crypto.algorithmName}`);
    }

    /**
     * Generate key
     */
    const key = await builtin.getKDF(headerData.key.keyDerivationFunctionOptions)
        .deriveKey(
            uint8arrayFrom(builtin.encodeString, password),
            headerData.key.salt,
            headerData.key.length,
        );

    return { algorithm, key };
}

function createNonceFromDiff(
    nonceDiff: SimpleHeaderData['crypto']['nonceDiff'],
    prevNonce: Uint8Array,
): Uint8Array {
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
    builtin: DecryptAlgorithmAndKeyAPIRecord,
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
        const { algorithm, key } = await getAlgorithmAndKey(builtin, password, headerData);

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

async function decryptChunk(
    builtin: DecryptAlgorithmAndKeyAPIRecord,
    password: InputDataType,
    reader: StreamReader,
    prevDecryptorMetadata?: DecryptorMetadata,
): Promise<{
    compressedCleartextIterable: AsyncIterableReturn<Uint8Array, void>;
    decryptorMetadata: DecryptorMetadata;
}> {
    /**
     * Parse header
     */
    const { headerData, decryptorMetadata } = await parseHeader(
        builtin,
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
    const compressedCleartextIterable = decryptorMetadata.algorithm.decrypt({
        key: decryptorMetadata.key,
        nonce: decryptorMetadata.nonce,
        authTag: headerData.crypto.authTag,
        ciphertext: ciphertextDataIterable,
    });

    return {
        compressedCleartextIterable,
        decryptorMetadata,
    };
}

export function createDecryptorIterator(
    builtin: DecryptBuiltinAPIRecord,
    password: InputDataType,
): IteratorConverter {
    return async function* decryptor(source) {
        const reader = new StreamReader(source, chunk => uint8arrayFrom(builtin.encodeString, validateChunk(chunk)));

        const {
            compressedCleartextIterable: firstChunkCompressedCleartextIterable,
            decryptorMetadata,
        } = await decryptChunk(builtin, password, reader);
        const compressedCleartextIterable = async function*() {
            yield* firstChunkCompressedCleartextIterable;
            let prevDecryptorMetadata = decryptorMetadata;
            while (!(await reader.isEnd())) {
                const { compressedCleartextIterable, decryptorMetadata: newDecryptorMetadata } = await decryptChunk(
                    builtin,
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
            ? builtin.decompressIterable(decryptorMetadata.compressAlgorithmName, compressedCleartextIterable)
            : compressedCleartextIterable;
    };
}
