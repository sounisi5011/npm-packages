import { randomBytes } from 'crypto';
import * as util from 'util';

import escapeStringRegexp from 'escape-string-regexp';

import { getKDF, KeyDerivationOptions } from '../../src/key-derivation-function';
import type { Argon2Options } from '../../src/key-derivation-function/argon2';
import { addNegativeNumber, createDummySizeBuffer, rangeArray } from '../helpers';

/** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L57 */
const ARGON2_MIN_OUTLEN = 4;

const password = 'Hoge Fuga';

describe('getKDF()', () => {
    describe('generate key', () => {
        const { deriveKey, saltLength } = getKDF(undefined);
        const salt = randomBytes(saltLength);

        it.each(rangeArray(ARGON2_MIN_OUTLEN, 20))('keyLengthBytes: %i', async keyLengthBytes => {
            const key = await deriveKey(password, salt, keyLengthBytes);
            expect(key).toBeByteSize(keyLengthBytes);
            const key2 = await deriveKey(password, salt, keyLengthBytes);
            expect(key2).toBytesEqual(key);
            const key3 = await deriveKey(password, salt, keyLengthBytes);
            expect(key3).toBytesEqual(key);
        });
    });

    it('unknown algorithm', () => {
        const algorithm = 'foooooooooooooo';
        // @ts-expect-error TS2322: Type '"foooooooooooooo"' is not assignable to type '"argon2d" | "argon2id"'.
        const options: KeyDerivationOptions = { algorithm };

        expect(() => getKDF(options)).toThrowWithMessage(
            TypeError,
            `Unknown KDF (Key Derivation Function) algorithm was received: ${algorithm}`,
        );
    });

    describe('invalid options', () => {
        it.each<unknown>([
            null,
            true,
            false,
            0,
            -0,
            42,
            -3,
            BigInt(0),
            BigInt(42),
            -BigInt(3),
            '',
            'foo',
            'argon2d',
            [],
            {},
        ])('%p', value => {
            // @ts-expect-error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'Readonly<Argon2Options> | undefined'.
            expect(() => getKDF(value)).toThrowWithMessage(
                TypeError,
                /^Unknown deriveKey options was received: /,
            );
        });
    });
});

describe('algorithm: Argon2', () => {
    type Argon2Opts = Omit<Argon2Options, 'algorithm'>;
    const optionNameList: ReadonlyArray<keyof Argon2Opts> = [
        'iterations',
        'memory',
        'parallelism',
    ];

    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L46 */
    const ARGON2_MIN_LANES = 1;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L47 */
    const ARGON2_MAX_LANES = 0xFFFFFF;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L50 */
    const ARGON2_MIN_THREADS = 1;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L51 */
    const ARGON2_MAX_THREADS = 0xFFFFFF;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L58 */
    const ARGON2_MAX_OUTLEN = 0xFFFFFFFF;
    /**
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L61
     * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/src/core.c#L473
     * @default 8
     */
    const ARGON2_MIN_MEMORY = (parallelism: number): number => Math.max(2 * 4, 8 * parallelism);
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L67-L68 */
    const ARGON2_MAX_MEMORY = 0xFFFFFFFF;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L71 */
    const ARGON2_MIN_TIME = 1;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L72 */
    const ARGON2_MAX_TIME = 0xFFFFFFFF;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L83 */
    const ARGON2_MIN_SALT_LENGTH = 8;
    /** @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/include/argon2.h#L84 */
    const ARGON2_MAX_SALT_LENGTH = 0xFFFFFFFF;

    const safeKeyLengthBytes = ARGON2_MIN_OUTLEN;

    describe('generate key', () => {
        describe.each<Argon2Options['algorithm']>([
            'argon2d',
            'argon2id',
        ])('%s', algorithm => {
            const { deriveKey, saltLength } = getKDF({ algorithm });
            const salt = randomBytes(saltLength);

            it.each(
                rangeArray(ARGON2_MIN_OUTLEN, 20),
            )('keyLengthBytes: %i', async keyLengthBytes => {
                const key = await deriveKey(password, salt, keyLengthBytes);
                expect(key).toBeByteSize(keyLengthBytes);
                const key2 = await deriveKey(password, salt, keyLengthBytes);
                expect(key2).toBytesEqual(key);
                const key3 = await deriveKey(password, salt, keyLengthBytes);
                expect(key3).toBytesEqual(key);
            });
        });
    });

    describe('normalize options', () => {
        it.each([
            {},
            ...optionNameList.flatMap<Argon2Opts>(optionName => [
                { [optionName]: undefined },
            ]),
        ])('%p', opts => {
            const options: Argon2Options = { algorithm: 'argon2d', ...opts };
            const { normalizedOptions } = getKDF(options);
            expect(normalizedOptions.iterations).toBeNumber();
            expect(normalizedOptions.memory).toBeNumber();
            expect(normalizedOptions.parallelism).toBeNumber();
        });
    });

    describe('invalid options', () => {
        const nonPositiveIntegerErrorMessageSuffix = (optionName: keyof Argon2Opts): string =>
            `The "${optionName}" option must be of positive integers without 0, but received:`;
        const notBetweenNumberErrorMessage = (
            name: string,
            { min, max }: Record<'min' | 'max', number | string>,
        ): string => `${name} must be between ${min} and ${max}`;

        describe.each<[string, unknown[]]>(
            Object.entries({
                'not number': [
                    null,
                    true,
                    false,
                    ...addNegativeNumber([
                        BigInt(0),
                        BigInt(1),
                        BigInt(2),
                    ]),
                    '',
                    'foo',
                    [],
                    {},
                ],
                'non integer': addNegativeNumber([
                    2.1,
                    2.5,
                    2.9,
                    0.1,
                    1.001,
                    NaN,
                    Infinity,
                ]),
            }),
        )('%s', (_, valueList) => {
            describe.each(valueList)('%p', value => {
                it.each(optionNameList.map<[Argon2Opts, keyof Argon2Opts]>(optionName => [
                    { [optionName]: value },
                    optionName,
                ]))('%p', (opts, optionName) => {
                    const options: Argon2Options = { algorithm: 'argon2d', ...opts };
                    expect(() => getKDF(options)).toThrowWithMessage(
                        TypeError,
                        new RegExp(`^${
                            escapeStringRegexp([
                                `Invalid type value received for Argon2's option "${optionName}"`,
                                nonPositiveIntegerErrorMessageSuffix(optionName),
                            ].join('. '))
                        }`),
                    );
                });
            });
        });

        describe.each(
            Object.entries({
                'zero': addNegativeNumber([0]),
                'negative integer': [-1],
            }),
            // eslint-disable-next-line jest/no-identical-title
        )('%s', (_, valueList) => {
            describe.each(valueList)('%p', value => {
                it.each(optionNameList.map<[Argon2Opts, keyof Argon2Opts]>(optionName => [
                    { [optionName]: value },
                    optionName,
                ]))('%p', (opts, optionName) => {
                    const options: Argon2Options = { algorithm: 'argon2d', ...opts };
                    expect(() => getKDF(options)).toThrowWithMessage(
                        RangeError,
                        new RegExp(`^${
                            escapeStringRegexp([
                                `Invalid integer received for Argon2's option "${optionName}"`,
                                nonPositiveIntegerErrorMessageSuffix(optionName),
                            ].join('. '))
                        }`),
                    );
                });
            });
        });

        const optionMinMaxRecord: Record<Exclude<keyof Argon2Opts, 'memory'>, Record<'min' | 'max', number>> & {
            memory: (parallelism: number) => Record<'min' | 'max', number>;
        } = {
            iterations: {
                min: ARGON2_MIN_TIME,
                max: ARGON2_MAX_TIME,
            },
            memory: parallelism => ({
                min: ARGON2_MIN_MEMORY(parallelism),
                max: ARGON2_MAX_MEMORY,
            }),
            parallelism: {
                min: Math.max(ARGON2_MIN_LANES, ARGON2_MIN_THREADS),
                max: Math.min(ARGON2_MAX_LANES, ARGON2_MAX_THREADS),
            },
        };
        describe.each(['small', 'large'] as const)('too %s', mode => {
            type Case = [
                string,
                { opts: Argon2Opts; optionName: keyof Argon2Opts; value: number; min: number; max: number },
            ];
            const table = optionNameList.flatMap<Case>(
                optionName => {
                    return rangeArray(0, optionName === 'memory' && mode === 'small' ? 5 : 0).map<Case>(parallelism => {
                        const { min, max } = optionName === 'memory'
                            ? optionMinMaxRecord[optionName](parallelism || 1)
                            : optionMinMaxRecord[optionName];
                        const [valueText, value] = mode === 'small'
                            ? [`${min} - 1`, min - 1]
                            : [`${max} + 1`, max + 1];
                        const opts: Argon2Opts = parallelism
                            ? { [optionName]: value, parallelism }
                            : { [optionName]: value };
                        const testName = util.inspect(
                            {
                                ...opts,
                                [optionName]: { [util.inspect.custom]: () => valueText },
                            },
                        );
                        return [testName, { opts, optionName, value, min, max }];
                    });
                },
            ).filter(([, { value }]) => value >= 1);
            it.each(table)('%s', (_, { opts, optionName, value, min, max }) => {
                const options: Argon2Options = { algorithm: 'argon2d', ...opts };
                expect(() => getKDF(options)).toThrowWithMessage(
                    RangeError,
                    [
                        `The value "${value}" is too ${mode} for Argon2's option "${optionName}"`,
                        notBetweenNumberErrorMessage(
                            `The "${optionName}" option`,
                            {
                                min: optionName === 'memory'
                                    ? `${min} (if "parallelism" option is ${options.parallelism ?? 1})`
                                    : min,
                                max,
                            },
                        ),
                    ].join('. '),
                );
            });
        });
        describe('too short', () => {
            it('salt length', async () => {
                const { deriveKey } = getKDF({ algorithm: 'argon2d' });
                const saltLength = ARGON2_MIN_SALT_LENGTH - 1;
                const salt = Buffer.alloc(saltLength);
                await expect(deriveKey('', salt, safeKeyLengthBytes)).rejects.toThrowWithMessage(
                    RangeError,
                    [
                        `Too short salt was received for Argon2's option "salt"`,
                        `${
                            notBetweenNumberErrorMessage(
                                `Salt length`,
                                { min: ARGON2_MIN_SALT_LENGTH, max: ARGON2_MAX_SALT_LENGTH },
                            )
                        }, but received: ${saltLength}`,
                    ].join('. '),
                );
            });
            it('key length', async () => {
                const { deriveKey, saltLength } = getKDF({ algorithm: 'argon2d' });
                const salt = Buffer.alloc(saltLength);
                const keyLengthBytes = ARGON2_MIN_OUTLEN - 1;
                await expect(deriveKey('', salt, keyLengthBytes)).rejects.toThrowWithMessage(
                    RangeError,
                    [
                        `The value "${keyLengthBytes}" is too short for Argon2's option "keyLengthBytes"`,
                        notBetweenNumberErrorMessage(`Key length`, { min: ARGON2_MIN_OUTLEN, max: ARGON2_MAX_OUTLEN }),
                    ].join('. '),
                );
            });
        });
        describe('too long', () => {
            it('salt length', async () => {
                const { deriveKey } = getKDF({ algorithm: 'argon2d' });
                const saltLength = ARGON2_MAX_SALT_LENGTH + 1;
                const salt = createDummySizeBuffer(saltLength);
                await expect(deriveKey('', salt, safeKeyLengthBytes)).rejects.toThrowWithMessage(
                    RangeError,
                    [
                        `Too long salt was received for Argon2's option "salt"`,
                        `${
                            notBetweenNumberErrorMessage(
                                `Salt length`,
                                { min: ARGON2_MIN_SALT_LENGTH, max: ARGON2_MAX_SALT_LENGTH },
                            )
                        }, but received: ${saltLength}`,
                    ].join('. '),
                );
            });
            it('key length', async () => {
                const { deriveKey, saltLength } = getKDF({ algorithm: 'argon2d' });
                const salt = Buffer.alloc(saltLength);
                const keyLengthBytes = ARGON2_MAX_OUTLEN + 1;
                await expect(deriveKey('', salt, keyLengthBytes)).rejects.toThrowWithMessage(
                    RangeError,
                    [
                        `The value "${keyLengthBytes}" is too long for Argon2's option "keyLengthBytes"`,
                        notBetweenNumberErrorMessage(`Key length`, { min: ARGON2_MIN_OUTLEN, max: ARGON2_MAX_OUTLEN }),
                    ].join('. '),
                );
            });
        });
    });

    it('internal error', async () => {
        const { deriveKey, saltLength } = getKDF({
            algorithm: 'argon2d',
            iterations: ARGON2_MIN_TIME,
            parallelism: ARGON2_MIN_THREADS,
            /**
             * This option tells Argon2 to use 1TiB of memory.
             * However, at present (May 2021), there is no computer in this world with such a huge memory.
             * Therefore, this process will always fail and Argon2's internal error will be output.
             */
            memory: 2 ** 40 / 2 ** 10,
        });
        const salt = Buffer.alloc(saltLength);
        await expect(deriveKey('', salt, safeKeyLengthBytes)).rejects.toThrowWithMessage(
            Error,
            /^Internal error from Argon2: /,
        );
    });
});
