import type { flatbuffers } from 'flatbuffers';

import type { Argon2Algorithm, NormalizedArgon2Options } from '../../key-derivation-function/argon2';
import { getPropFromValue, printObject } from '../../utils';
import { assertType } from '../../utils/type';
import { Argon2Options, Argon2Type } from './header_generated';

function algorithm2Argon2Type(algorithm: Argon2Algorithm): Argon2Type {
    if (algorithm === 'argon2d') return Argon2Type.Argon2d;
    if (algorithm === 'argon2id') return Argon2Type.Argon2id;

    assertType<never>(algorithm);
    throw new Error(`Unknown Argon2 algorithm received: ${printObject(algorithm)}`);
}

function argon2Type2algorithm(argon2Type: Argon2Type): Argon2Algorithm {
    if (argon2Type === Argon2Type.Argon2d) return 'argon2d';
    if (argon2Type === Argon2Type.Argon2id) return 'argon2id';

    assertType<never>(argon2Type);
    throw new Error(
        `The value in the type field in the Argon2Options table is unknown. Received: ${getPropFromValue(
            Argon2Type,
            argon2Type,
        ) ?? printObject(argon2Type)}`,
    );
}

export function createFbsArgon2OptionsTable(
    builder: flatbuffers.Builder,
    options: NormalizedArgon2Options,
): flatbuffers.Offset {
    return Argon2Options.create(
        builder,
        algorithm2Argon2Type(options.algorithm),
        options.iterations,
        options.memory,
        options.parallelism,
    );
}

export function parseFbsArgon2OptionsTable(argon2Options: Argon2Options): NormalizedArgon2Options {
    return {
        algorithm: argon2Type2algorithm(argon2Options.type()),
        iterations: argon2Options.timeIterations(),
        memory: argon2Options.memoryKib(),
        parallelism: argon2Options.parallelism(),
    };
}
