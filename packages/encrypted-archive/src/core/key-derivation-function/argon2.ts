import { isPropAccessible } from '@sounisi5011/ts-utils-is-property-accessible';
import capitalize from 'capitalize';

import type { BuiltinInspectRecord } from '../types/builtin';
import {
    Argon2Algorithm,
    Argon2HashFn,
    Argon2Options,
    argon2TypeNameList,
    GetArgon2KDFResult,
    NormalizedArgon2Options,
} from '../types/key-derivation-function/argon2';
import { assertType, isInteger, objectEntries, objectFromEntries, RequiredExcludeUndefined } from '../types/utils';
import { ifFuncThenExec, normalizeOptions, passThroughString } from '../utils';
import { isNotUndefined } from '../utils/type-check';

export const defaultOptions: NormalizedArgon2Options = {
    algorithm: 'argon2d',
    iterations: 3,
    memory: 12,
    parallelism: 1,
};

/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Number of iterations `t` (used to tune the running time independently of the memory size) can be any
 * >   integer number from `1` to `2^32 − 1`;
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=5
 */
const ARGON2_ITERATIONS = { MIN: 1, MAX: 2 ** 32 - 1 };
/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Memory size `m` can be any integer number of kilobytes from `8p` to `2^32 − 1`. The actual number of blocks
 * >   is `m′`, which is `m` rounded down to the nearest multiple of `4p`.
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
 */
const ARGON2_MEMORY = {
    MIN: (parallelism: number): number => 8 * parallelism,
    MAX: 2 ** 32 - 1,
};
/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Degree of parallelism `p` determines how many independent (but synchronizing) computational chains can
 * >   be run. It may take any integer value from `1` to `2^24 − 1`.
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
 */
const ARGON2_PARALLELISM = { MIN: 1, MAX: 2 ** 24 - 1 };
/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Message `P` may have any length from `0` to `2^32 − 1` bytes;
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
 */
const ARGON2_PASSWORD = { MIN: 0, MAX: 2 ** 32 - 1 };
/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Nonce `S` may have any length from `8` to `2^32 − 1` bytes (16 bytes is recommended for password hashing).
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
 */
const ARGON2_SALT = { MIN: 8, MAX: 2 ** 32 - 1 };
/**
 * > # 3 Specification of Argon2
 * > ## 3.1 Inputs
 * > * Tag length `τ` may be any integer number of bytes from `4` to `2^32 − 1`.
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.password-hashing.net/argon2-specs.pdf#page=4
 */
const ARGON2_OUTPUT = { MIN: 4, MAX: 2 ** 32 - 1 };
/**
 * > 9 Recommended parameters
 * > 5. Select the salt length. 128 bits is sufficient for all applications, but can be reduced to 64 bits in the case
 * >    of space constraints.
 * @see https://github.com/P-H-C/phc-winner-argon2/blob/16d3df698db2486dde480b09a732bf9bf48599f9/argon2-specs.pdf
 * @see https://www.ory.sh/choose-recommended-argon2-parameters-password-hashing/
 */
const SALT_LEN = 128 / 8;

function isArgon2Algorithm(algorithm: unknown): algorithm is Argon2Algorithm {
    // Note: The `Array.prototype.includes()` method cannot be used because its argument cannot be assigned the type `unknown`.
    for (const type of argon2TypeNameList) {
        if (algorithm === type) return true;
    }
    return false;
}

export function isArgon2Options<T>(options: T): options is T extends Argon2Options ? T : never {
    if (!isPropAccessible(options) || typeof options !== 'object') return false;
    return isArgon2Algorithm(options['algorithm']);
}

function validatePositiveInteger(builtin: BuiltinInspectRecord, optionName: string, value: unknown): asserts value {
    const messageSuffix = `The "${optionName}" option must be of positive integers without 0, but received: ${
        builtin.inspect(value)
    }`;
    if (!(Number.isInteger as isInteger)(value)) {
        throw new TypeError(`Invalid type value received for Argon2's option "${optionName}". ${messageSuffix}`);
    }
    if (value < 1) {
        throw new RangeError(`Invalid integer received for Argon2's option "${optionName}". ${messageSuffix}`);
    }
}

interface ValidateBetweenOptions<TValue> {
    min: number;
    max: number;
    tooX?: { min: string; max: string } | undefined;
    type?: string | undefined;
    startPrefix?: ValidateBetweenOptionsFn<TValue, { min: string; max: string }> | undefined;
    rangeCond?: Partial<Record<'min' | 'max', ValidateBetweenOptionsFn<TValue, string>>> | undefined;
    suffix?: Partial<Record<'prefix' | 'suffix', ValidateBetweenOptionsFn<TValue, string>>> | undefined;
}

type ValidateBetweenOptionsFn<TValue, TReturn> =
    | TReturn
    | ((
        options:
            & { value: TValue }
            & ValidateBetweenOptions<TValue>
            & RequiredExcludeUndefined<Pick<ValidateBetweenOptions<TValue>, 'tooX' | 'type'>>,
    ) => TReturn | undefined);

function createBetweenErrorMessage<TValue extends number>(
    optionName: string,
    value: TValue,
    options: ValidateBetweenOptions<TValue>,
): Record<'min' | 'max', string> {
    const tooX = options.tooX ?? { min: 'small', max: 'large' };
    const type = options.type ?? `the "${optionName}" option`;
    const subOpts = { value, ...options, tooX, type };
    const between = (Object.fromEntries as objectFromEntries)((['min', 'max'] as const).map(mode => {
        const cond = ifFuncThenExec(options.rangeCond?.[mode], subOpts);
        const message = cond ? `${options[mode]} (${cond})` : options[mode];
        return [mode, message];
    }));
    const messageSuffixList: string[] = [
        ifFuncThenExec(options.suffix?.prefix, subOpts),
        `${type} must be between ${between.min} and ${between.max}`,
        ifFuncThenExec(options.suffix?.suffix, subOpts),
    ].filter(isNotUndefined);

    const startPrefix = ifFuncThenExec(options.startPrefix, subOpts) ?? {
        min: `the value "${value}" is too ${tooX.min}`,
        max: `the value "${value}" is too ${tooX.max}`,
    };
    const messageSuffix = capitalize(messageSuffixList.join(', '));
    return {
        min: `${capitalize(startPrefix.min)} for Argon2's option "${optionName}". ${messageSuffix}`,
        max: `${capitalize(startPrefix.max)} for Argon2's option "${optionName}". ${messageSuffix}`,
    };
}

function validateBetween<TValue extends number>(
    optionName: string,
    value: TValue,
    options: ValidateBetweenOptions<TValue>,
): asserts value {
    const errorMessage = createBetweenErrorMessage(optionName, value, options);
    if (!(options.min <= value)) throw new RangeError(errorMessage.min);
    if (!(value <= options.max)) throw new RangeError(errorMessage.max);
}

interface ValidateBetweenLengthOptions<TValue> extends ValidateBetweenOptions<TValue> {
    shortName?: string | undefined;
}

function validateBetweenLength<TValue extends number>(
    optionName: string,
    value: TValue,
    options: ValidateBetweenLengthOptions<TValue>,
): asserts value {
    validateBetween(optionName, value, {
        type: `${options.shortName ?? optionName} length`,
        tooX: { min: 'short', max: 'long' },
        ...options,
    });
}

function validateBetweenByteLength(
    optionName: string,
    value: ArrayBufferView,
    options: ValidateBetweenLengthOptions<number>,
): asserts value {
    validateBetweenLength(
        optionName,
        value.byteLength,
        {
            startPrefix: opts =>
                (Object.fromEntries as objectFromEntries)((['min', 'max'] as const).map(mode => [
                    mode,
                    `Too ${opts.tooX[mode]} ${options.shortName ?? optionName} was received`,
                ])),
            ...options,
            suffix: { suffix: ({ value }) => `but received: ${value}`, ...options.suffix },
        },
    );
}

function validateArgon2Options(
    builtin: BuiltinInspectRecord,
    options: Omit<NormalizedArgon2Options, 'algorithm'>,
): asserts options {
    const memoryOptionName = 'memory';
    for (const [optionName, value] of (Object.entries as objectEntries)(options)) {
        validatePositiveInteger(builtin, optionName, value);
        if (optionName === 'iterations') {
            validateBetween(optionName, value, { min: ARGON2_ITERATIONS.MIN, max: ARGON2_ITERATIONS.MAX });
        } else if (optionName === 'parallelism') {
            validateBetween(optionName, value, { min: ARGON2_PARALLELISM.MIN, max: ARGON2_PARALLELISM.MAX });
        } else {
            assertType<typeof memoryOptionName>(optionName);
        }
    }

    const parallelismOptionName = 'parallelism';
    const parallelism = options[parallelismOptionName];
    validateBetween(
        memoryOptionName,
        options[memoryOptionName],
        {
            min: ARGON2_MEMORY.MIN(parallelism),
            max: ARGON2_MEMORY.MAX,
            rangeCond: { min: `if "${parallelismOptionName}" option is ${parallelism}` },
        },
    );
}

function normalizeInternalError(builtin: BuiltinInspectRecord) {
    return (error: unknown): never => {
        if (error instanceof Error) {
            error.message = `Internal error from Argon2: ${error.message}`;
            throw error;
        }
        if (typeof error === 'object' && isPropAccessible(error)) {
            const { message, code, ...other } = error;
            if (typeof message === 'string' && typeof code === 'number' && Object.keys(other).length === 0) {
                throw Object.assign(
                    new Error(`Internal error from Argon2: ${message}`),
                    { code },
                );
            }
        }
        throw new Error(`Internal error from Argon2: ${builtin.inspect(error)}`);
    };
}

const createDeriveKeyFunc = (
    builtin: { argon2Hash: Argon2HashFn } & BuiltinInspectRecord,
    options: NormalizedArgon2Options,
): GetArgon2KDFResult['deriveKey'] =>
async (password, salt, keyLengthBytes) => {
    validateBetweenByteLength(
        'password',
        password,
        { min: ARGON2_PASSWORD.MIN, max: ARGON2_PASSWORD.MAX },
    );
    validateBetweenByteLength('salt', salt, { min: ARGON2_SALT.MIN, max: ARGON2_SALT.MAX });
    validateBetweenLength(
        'keyLengthBytes',
        keyLengthBytes,
        { shortName: 'key', min: ARGON2_OUTPUT.MIN, max: ARGON2_OUTPUT.MAX },
    );

    return await builtin.argon2Hash({
        ...options,
        password,
        salt,
        hashLength: keyLengthBytes,
    })
        .catch(normalizeInternalError(builtin));
};

export function getArgon2KDF(builtin: { argon2Hash: Argon2HashFn } & BuiltinInspectRecord) {
    return (options: Readonly<Argon2Options>): GetArgon2KDFResult => {
        const { algorithm, ...argon2Options } = normalizeOptions(defaultOptions, options);
        if (!isArgon2Algorithm(algorithm)) {
            throw new TypeError(
                `Invalid Argon2 type received: ${passThroughString(builtin.inspect, algorithm)}`,
            );
        }
        validateArgon2Options(builtin, argon2Options);

        return {
            deriveKey: createDeriveKeyFunc(builtin, { algorithm, ...argon2Options }),
            saltLength: SALT_LEN,
            normalizedOptions: { algorithm, ...argon2Options },
        };
    };
}
