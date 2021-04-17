import { randomBytes } from 'crypto';

import { cryptAlgorithmMap, CryptAlgorithmName, defaultCryptAlgorithmName } from './cipher';
import { compress, CompressOptionsWithString, decompress } from './compress';
import { createHeader, parseHeader } from './header';
import { deriveKey, KeyDerivationOptions, SALT_LENGTH_BYTES } from './key-derivation-function';
import { Nonce } from './nonce';
import { DecryptorTransform, EncryptorTransform } from './stream';

export interface EncryptOptions {
    algorithm?: CryptAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
    compress?: CompressOptionsWithString;
}

export { CompressOptionsWithString, CryptAlgorithmName, KeyDerivationOptions };

const nonceState = new Nonce();

export async function encrypt(
    cleartext: string | Buffer,
    password: string | Buffer,
    options: EncryptOptions = {},
): Promise<Buffer> {
    const algorithm = cryptAlgorithmMap.get(options.algorithm ?? defaultCryptAlgorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${String(options.algorithm)}`);
    }

    /**
         * Compress cleartext
         */
    const { algorithm: compressAlgorithmName, data: compressedCleartext } = options.compress
        ? await compress(cleartext, options.compress)
        : { algorithm: undefined, data: cleartext };

    /**
      * Generate key
      */
    const salt = randomBytes(SALT_LENGTH_BYTES);
    const keyLength = algorithm.keyLength;
    const { key, normalizedOptions: normalizedKeyDerivationOptions } = await deriveKey(
        password,
        salt,
        keyLength,
        options.keyDerivation,
    );

    /**
      * Generate nonce (also known as an IV / Initialization Vector)
      */
    const nonce = nonceState.create(algorithm.nonceLength);

    /**
      * Encrypt cleartext
      */
    const cipher = algorithm.createCipher(key, nonce);
    const ciphertextPart1 = cipher.update(compressedCleartext);
    const ciphertextPart2 = cipher.final();

    /**
      * Get authentication tag
      */
    const authTag = cipher.getAuthTag();

    /**
      * Generate header data
      * The data contained in the header will be used for decryption.
      */
    const headerData = createHeader({
        algorithmName: algorithm.name,
        salt,
        keyLength,
        keyDerivationOptions: normalizedKeyDerivationOptions,
        nonce,
        authTag,
        compressAlgorithmName,
    });

    /**
      * Merge header and ciphertext
      */
    const encryptedData = Buffer.concat([
        headerData,
        ciphertextPart1,
        ciphertextPart2,
    ]);
    return encryptedData;
}

export async function decrypt(encryptedData: Buffer, password: string | Buffer): Promise<Buffer> {
    /**
     * Verify the structure of encrypted data & read the headers contained in the encrypted data
     */
    const [data, ciphertext] = parseHeader(encryptedData);

    const algorithm = cryptAlgorithmMap.get(data.algorithmName);
    if (!algorithm) {
        throw new TypeError(`Unknown algorithm was received: ${data.algorithmName}`);
    }

    /**
     * Update the invocation part in the nonce
     */
    nonceState.updateInvocation(data.nonce);

    /**
     * Generate key
     */
    const { key } = await deriveKey(password, data.salt, data.keyLength, data.keyDerivationOptions);

    /**
     * Decrypt ciphertext
     */
    const decipher = algorithm.createDecipher(key, data.nonce);
    decipher.setAuthTag(data.authTag);
    const compressedCleartext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
    ]);

    /**
     * Decompress cleartext
     */
    const cleartext = data.compressAlgorithmName
        ? await decompress(compressedCleartext, data.compressAlgorithmName)
        : compressedCleartext;

    return cleartext;
}

export function encryptStream(password: string | Buffer, options: EncryptOptions = {}): EncryptorTransform {
    return new EncryptorTransform(password, options);
}

export function decryptStream(password: string | Buffer): DecryptorTransform {
    return new DecryptorTransform(password);
}
