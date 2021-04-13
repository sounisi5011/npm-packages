import { hasOwnProp } from '../utils';
import type { OverrideProp } from '../utils/type';
import {
    Argon2Options,
    defaultOptions as defaultArgon2Options,
    deriveArgon2Key,
    isArgon2Options,
    NormalizedArgon2Options,
} from './argon2';

export interface BaseKeyDerivationOptions {
    algorithm: string;
}

type KeyDerivationOptionsWithoutDefault = Argon2Options;
export type DefaultKeyDerivationOptions = OverrideProp<Argon2Options, { algorithm?: undefined }>;
export type KeyDerivationOptions = KeyDerivationOptionsWithoutDefault | DefaultKeyDerivationOptions;
export type NormalizedKeyDerivationOptions = Required<KeyDerivationOptionsWithoutDefault>;

export interface DeriveKeyResult<T extends NormalizedKeyDerivationOptions> {
    key: Uint8Array;
    normalizedOptions: T;
}

async function defaultDeriveKey(
    password: string | Buffer,
    salt: Uint8Array,
    keyLengthBytes: number,
    options?: Readonly<DefaultKeyDerivationOptions>,
): Promise<DeriveKeyResult<NormalizedArgon2Options>> {
    const normalizedOptions = { ...defaultArgon2Options, ...options, algorithm: defaultArgon2Options.algorithm };
    return await deriveArgon2Key(password, salt, keyLengthBytes, normalizedOptions);
}

export const SALT_LENGTH_BYTES = 256 / 8;

export async function deriveKey(
    password: string | Buffer,
    salt: Uint8Array,
    keyLengthBytes: number,
    options?: Readonly<KeyDerivationOptions>,
): Promise<DeriveKeyResult<NormalizedKeyDerivationOptions>> {
    if (options && isArgon2Options(options)) {
        return await deriveArgon2Key(password, salt, keyLengthBytes, options);
    } else if (!options || !options.algorithm) {
        return await defaultDeriveKey(password, salt, keyLengthBytes, options);
    }
    if (options && hasOwnProp(options, 'algorithm')) {
        // @ts-expect-error Property 'algorithm' does not exist on type 'never'.
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new TypeError(`Unknown KDF (Key Derivation Function) algorithm was received: ${options.algorithm}`);
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new TypeError(`Unknown deriveKey options was received: ${options}`);
    }
}
