import type * as stream from 'stream';

import { CryptAlgorithm, cryptAlgorithmMap } from './cipher';
import { CompressAlgorithmName, decompress } from './compress';
import {
    HeaderData,
    parseCiphertextData,
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
import gts from './utils/generator-transform-stream';
import { StreamReader } from './utils/stream';

export interface DecryptedData {
    cleartext: Buffer;
    readByteLength: number;
}

export interface DecryptorMetadata {
    algorithm: CryptAlgorithm;
    key: Uint8Array;
    compressAlgorithmName: CompressAlgorithmName | undefined;
}

export type DecryptedFirstData = DecryptedData & DecryptorMetadata;

function decrypt(
    { algorithm, key, nonce, authTag, ciphertext }: {
        algorithm: CryptAlgorithm;
        key: Uint8Array;
        nonce: Uint8Array;
        authTag: Uint8Array;
        ciphertext: Uint8Array;
    },
): Buffer {
    try {
        const decipher = algorithm.createDecipher(key, nonce);
        decipher.setAuthTag(authTag);
        return Buffer.concat([
            decipher.update(ciphertext),
            decipher.final(),
        ]);
    } catch (error) {
        fixNodePrimordialsErrorInstance(error);
    }
}

export function createDecryptorTransform(password: InputDataType): stream.Duplex {
    const stream = gts(async function*(inputStream) {
        const reader = new StreamReader(inputStream, chunk => {
            validateChunk(chunk);
            return bufferFrom(chunk, 'utf8');
        });
        const seekToEndOffset = async <T extends { endOffset: number }>(result: T): Promise<Omit<T, 'endOffset'>> => {
            const { endOffset, ...other } = result;
            await reader.seek(endOffset);
            return other;
        };

        let decryptorMetadata: DecryptorMetadata | undefined;
        while (!(await reader.isEnd())) {
            let headerData: HeaderData | SimpleHeaderData;
            if (!decryptorMetadata) {
                await seekToEndOffset(validateCID({ data: await reader.read(9) }));
                const { dataByteLength: headerByteLength } = await seekToEndOffset(
                    parseHeaderLength({ data: await reader.read(9) }),
                );
                const fullHeaderData = (await seekToEndOffset(parseHeaderData({
                    data: await reader.read(headerByteLength),
                    headerByteLength,
                }))).headerData;

                const algorithm = cryptAlgorithmMap.get(fullHeaderData.algorithmName);
                if (!algorithm) {
                    throw new TypeError(`Unknown algorithm was received: ${fullHeaderData.algorithmName}`);
                }

                /**
                 * Generate key
                 */
                const key = await getKDF(fullHeaderData.keyDerivationOptions)
                    .deriveKey(
                        password,
                        fullHeaderData.salt,
                        fullHeaderData.keyLength,
                    );

                headerData = fullHeaderData;
                decryptorMetadata = {
                    algorithm: algorithm,
                    key,
                    compressAlgorithmName: fullHeaderData.compressAlgorithmName,
                };
            } else {
                const { dataByteLength: headerByteLength } = await seekToEndOffset(
                    parseSimpleHeaderLength({ data: await reader.read(9) }),
                );
                headerData = (await seekToEndOffset(parseSimpleHeaderData({
                    data: await reader.read(headerByteLength),
                    headerByteLength,
                }))).headerData;
            }

            const { dataByteLength: ciphertextByteLength } = await seekToEndOffset(
                parseCiphertextLength({ data: await reader.read(9) }),
            );
            const { ciphertextDataBytes } = await seekToEndOffset(parseCiphertextData({
                data: await reader.read(ciphertextByteLength),
                ciphertextByteLength,
            }));

            /**
             * Update the invocation part in the nonce
             */
            nonceState.updateInvocation(headerData.nonce);

            /**
             * Decrypt ciphertext
             */
            const compressedCleartext = decrypt({
                algorithm: decryptorMetadata.algorithm,
                key: decryptorMetadata.key,
                nonce: headerData.nonce,
                authTag: headerData.authTag,
                ciphertext: ciphertextDataBytes,
            });

            /**
             * Decompress cleartext
             */
            const cleartext = decryptorMetadata.compressAlgorithmName
                ? await decompress(compressedCleartext, decryptorMetadata.compressAlgorithmName)
                : compressedCleartext;

            yield cleartext;
        }
    }, { readableObjectMode: true, writableObjectMode: true });
    return stream;
}
