import { validatePassword } from './errors';
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
import type { BuiltinEncodeStringRecord, BuiltinInspectRecord } from './types/builtin';
import type { CompressAlgorithmName, DecompressIterable } from './types/compress';
import type { CryptoAlgorithmData, GetCryptoAlgorithm } from './types/crypto';
import type { KDFBuiltinAPIRecord } from './types/key-derivation-function';
import type { AsyncIterableReturn } from './types/utils';
import { uint8arrayFrom } from './utils/array-buffer';
import { asyncIter2AsyncIterable, convertChunk } from './utils/convert';
import { BufferReader } from './utils/reader';

export interface DecryptBuiltinAPIRecord extends BuiltinEncodeStringRecord, BuiltinInspectRecord {
    getCryptoAlgorithm: GetCryptoAlgorithm;
    kdfBuiltin: KDFBuiltinAPIRecord;
    decompressIterable: DecompressIterable;
}

interface DecryptorMetadata {
    algorithm: CryptoAlgorithmData;
    key: Uint8Array;
    nonce: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

async function getAlgorithmAndKey(
    builtin: { getCryptoAlgorithm: GetCryptoAlgorithm; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
    password: Uint8Array,
    headerData: HeaderData,
): Promise<{ algorithm: CryptoAlgorithmData; key: Uint8Array }> {
    const algorithm = builtin.getCryptoAlgorithm(headerData.crypto.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${headerData.crypto.algorithmName}`);
    }

    /**
     * Generate key
     */
    const key = await getKDF(builtin, headerData.key.keyDerivationFunctionOptions)
        .deriveKey(
            password,
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
    builtin: { getCryptoAlgorithm: GetCryptoAlgorithm; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
    password: Uint8Array,
    reader: BufferReader,
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
        const { headerData } = await parseHeaderData(builtin, reader, { headerByteLength });

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
        const { headerData } = await parseSimpleHeaderData(builtin, reader, { headerByteLength });
        const nonce = createNonceFromDiff(headerData.crypto.nonceDiff, prevDecryptorMetadata.nonce);
        return {
            headerData,
            decryptorMetadata: { ...prevDecryptorMetadata, nonce },
        };
    }
}

async function decryptChunk(
    builtin: { getCryptoAlgorithm: GetCryptoAlgorithm; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
    password: Uint8Array,
    reader: BufferReader,
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
    const ciphertextDataIterableIterator = parseCiphertextIterable(reader, { ciphertextByteLength });

    /**
     * Decrypt ciphertext
     */
    const compressedCleartextIterable = asyncIter2AsyncIterable(
        decryptorMetadata.algorithm.decrypt({
            key: decryptorMetadata.key,
            nonce: decryptorMetadata.nonce,
            authTag: headerData.crypto.authTag,
            ciphertextIter: ciphertextDataIterableIterator,
        }),
    );

    return {
        compressedCleartextIterable,
        decryptorMetadata,
    };
}

async function decryptAllChunks(
    builtin: { getCryptoAlgorithm: GetCryptoAlgorithm; kdfBuiltin: KDFBuiltinAPIRecord } & BuiltinInspectRecord,
    password: Uint8Array,
    reader: BufferReader,
): Promise<{
    compressedCleartextIterable: AsyncIterable<Uint8Array>;
    compressAlgorithmName: DecryptorMetadata['compressAlgorithmName'];
}> {
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
    return {
        compressedCleartextIterable,
        compressAlgorithmName: decryptorMetadata.compressAlgorithmName,
    };
}

export function createDecryptorIterator(builtin: DecryptBuiltinAPIRecord, password: InputDataType): IteratorConverter {
    validatePassword(builtin, password);
    return async function* decryptor(source) {
        const passwordBuffer = uint8arrayFrom(builtin.encodeString, password);
        const reader = new BufferReader(source, convertChunk(builtin));

        const {
            compressedCleartextIterable,
            compressAlgorithmName,
        } = await decryptAllChunks(builtin, passwordBuffer, reader);

        /**
         * Decompress cleartext
         */
        yield* compressAlgorithmName
            ? builtin.decompressIterable(compressAlgorithmName, compressedCleartextIterable)
            : compressedCleartextIterable;
    };
}
