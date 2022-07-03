import { version as nodeVersion } from 'process';

import type { Argon2HashFn } from '../../../core/types/key-derivation-function/argon2.js';

const nodeVersionMatch = /^v(\d+)\.(\d+)\./.exec(nodeVersion);

/**
 * For Node.js 18.1.0 and later, use node-argon2 instead of argon2-browser.
 * Because argon2-browser fails in Node.js 18.1.0 or later.
 * @see https://github.com/antelle/argon2-browser/issues/81
 */
export const argon2Hash: Argon2HashFn = (
    (Number(nodeVersionMatch?.[1]) >= 18 && Number(nodeVersionMatch?.[2]) >= 1)
        ? // In Node.js >=18.1.0, use node-argon2
            (() => {
                const argon2Mod = import('argon2'); // eslint-disable-line node/no-unsupported-features/es-syntax
                return async options => {
                    const argon2 = await argon2Mod;
                    const typeRecord = {
                        argon2d: argon2.argon2d,
                        argon2id: argon2.argon2id,
                    } as const;
                    return await argon2.hash(options.password, {
                        salt: Buffer.from(options.salt),
                        timeCost: options.iterations,
                        memoryCost: options.memory,
                        hashLength: options.hashLength,
                        parallelism: options.parallelism,
                        type: typeRecord[options.algorithm],
                        raw: true,
                    });
                };
            })()
        : // For Node.js <18.1.0, use argon2-browser
            (() => {
                const mod = import('../../browser/key-derivation-function/argon2.js'); // eslint-disable-line node/no-unsupported-features/es-syntax
                return async options => await (await mod).argon2Hash(options);
            })()
);
