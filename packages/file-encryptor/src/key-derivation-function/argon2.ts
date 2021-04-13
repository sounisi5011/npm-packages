import argon2 from 'argon2-browser';

import type { BaseKeyDerivationOptions, DeriveKeyResult } from '.';

const typeNameList = ['argon2d', 'argon2id'] as const;

export interface Argon2Options extends BaseKeyDerivationOptions {
    algorithm: (typeof typeNameList)[number];
    iterations?: number;
    memory?: number;
    parallelism?: number;
}
export type NormalizedArgon2Options = Required<Argon2Options>;

export const defaultOptions: NormalizedArgon2Options = {
    algorithm: 'argon2d',
    iterations: 3,
    memory: 12,
    parallelism: 1,
};

export function isArgon2Options<T extends Record<string, unknown>>(options: T): options is T & Argon2Options {
    const { algorithm } = options;
    for (const type of typeNameList) {
        if (algorithm === type) return true;
    }
    return false;
}

export async function deriveArgon2Key(
    password: string | Uint8Array,
    salt: Uint8Array,
    keyLengthBytes: number,
    options: Readonly<Argon2Options>,
): Promise<DeriveKeyResult<NormalizedArgon2Options>> {
    const normalizedOptions = { ...defaultOptions, ...options };

    let type: argon2.ArgonType;
    if (normalizedOptions.algorithm === 'argon2d') {
        type = argon2.ArgonType.Argon2d;
    } else if (normalizedOptions.algorithm === 'argon2id') {
        type = argon2.ArgonType.Argon2id;
    } else {
        // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
        throw new TypeError(`Invalid Argon2 type received: ${normalizedOptions.algorithm}`);
    }

    const { hash: key } = await argon2.hash({
        pass: password,
        salt,
        time: normalizedOptions.iterations,
        mem: normalizedOptions.memory,
        hashLen: keyLengthBytes,
        parallelism: normalizedOptions.parallelism,
        type,
    });
    return { key, normalizedOptions };
}
