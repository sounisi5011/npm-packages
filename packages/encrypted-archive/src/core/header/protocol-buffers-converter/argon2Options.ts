import { Argon2Options } from '../../../protocol-buffers/header_pb';
import type { BuiltinInspectRecord } from '../../types/builtin';
import type { NormalizedArgon2Options } from '../../types/key-derivation-function/argon2';
import { createEnum2value, validateNumberField } from './utils';

const dataName = 'Argon2Options data';

const {
    enum2value: argon2Type2algorithm,
    value2enum: algorithm2Argon2Type,
} = createEnum2value<NormalizedArgon2Options['algorithm']>()(Argon2Options.Argon2Type)([
    [Argon2Options.Argon2Type.ARGON2D, 'argon2d'],
    [Argon2Options.Argon2Type.ARGON2ID, 'argon2id'],
]);

export function createProtobufArgon2Options(
    builtin: BuiltinInspectRecord,
    options: NormalizedArgon2Options,
): Argon2Options {
    return new Argon2Options()
        .setType(algorithm2Argon2Type(builtin, options.algorithm))
        .setTimeIterations(options.iterations)
        .setMemoryKib(options.memory)
        .setParallelism(options.parallelism);
}

export function parseProtobufArgon2Options(
    builtin: BuiltinInspectRecord,
    argon2Options: Argon2Options,
): NormalizedArgon2Options {
    return {
        algorithm: argon2Type2algorithm(
            builtin,
            argon2Options.getType(),
            true,
            { fieldName: 'type', dataName },
        ),
        iterations: validateNumberField(
            argon2Options.getTimeIterations(),
            true,
            { fieldName: 'time_iterations', dataName },
        ),
        memory: validateNumberField(
            argon2Options.getMemoryKib(),
            true,
            { fieldName: 'memory_kib', dataName },
        ),
        parallelism: validateNumberField(
            argon2Options.getParallelism(),
            true,
            { fieldName: 'parallelism', dataName },
        ),
    };
}
