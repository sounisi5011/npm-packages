import { randomBytes } from 'crypto';

import { CryptAlgorithm, cryptAlgorithmMap, CryptAlgorithmName, defaultCryptAlgorithmName } from './cipher';
import { compress, CompressOptionsWithString, decompress } from './compress';
import { createHeader, parseHeader } from './header';
import { deriveKey, KeyDerivationOptions, SALT_LENGTH_BYTES } from './key-derivation-function';
import { Nonce } from './nonce';
import { DecryptorTransform, EncryptorTransform } from './stream';

export interface EncryptorOptions {
    algorithm?: CryptAlgorithmName;
    keyDerivation?: KeyDerivationOptions;
}

export interface EncryptOptions {
    compress?: CompressOptionsWithString;
}

export { CompressOptionsWithString, CryptAlgorithmName, KeyDerivationOptions };

export class Encryptor {
    private readonly password: string | Buffer;
    private readonly algorithm: CryptAlgorithm;
    private readonly keyDerivationOptions: KeyDerivationOptions | undefined;
    private readonly nonce = new Nonce();

    constructor(password: string | Buffer, options: EncryptorOptions = {}) {
        const algorithm = cryptAlgorithmMap.get(options.algorithm ?? defaultCryptAlgorithmName);
        if (!algorithm) {
            throw new TypeError(`Unknown algorithm was received: ${String(options.algorithm)}`);
        }
        this.password = password;
        this.algorithm = algorithm;
        this.keyDerivationOptions = options.keyDerivation;
    }

    async encrypt(cleartext: string | Buffer, options: EncryptOptions = {}): Promise<Buffer> {
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
        const keyLength = this.algorithm.keyLength;
        const { key, normalizedOptions: normalizedKeyDerivationOptions } = await deriveKey(
            this.password,
            salt,
            keyLength,
            this.keyDerivationOptions,
        );

        /**
         * Generate nonce (also known as an IV / Initialization Vector)
         */
        const nonce = this.nonce.create(this.algorithm.nonceLength);

        /**
         * Encrypt cleartext
         */
        const cipher = this.algorithm.createCipher(key, nonce);
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
            algorithmName: this.algorithm.name,
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

    async decrypt(encryptedData: Buffer): Promise<Buffer> {
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
        this.nonce.updateInvocation(data.nonce);

        /**
         * Generate key
         */
        const { key } = await deriveKey(this.password, data.salt, data.keyLength, data.keyDerivationOptions);

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

    encryptStream(options: EncryptOptions = {}): EncryptorTransform {
        return new EncryptorTransform(this, options);
    }

    decryptStream(): DecryptorTransform {
        return new DecryptorTransform(this);
    }
}
