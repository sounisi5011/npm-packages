import type { NormalizedArgon2Options } from '../../key-derivation-function/argon2';
import { Argon2Options } from '../protocol-buffers/header_pb';
import { createEnum2value, validateNumberField } from './utils';

const dataName = 'Argon2Options data';

const {
    enum2value: argon2Type2algorithm,
    value2enum: algorithm2Argon2Type,
} = createEnum2value<NormalizedArgon2Options['algorithm']>()(Argon2Options.Argon2Type)([
    [Argon2Options.Argon2Type.ARGON2D, 'argon2d'],
    [Argon2Options.Argon2Type.ARGON2ID, 'argon2id'],
]);

export function createProtobufArgon2Options(options: NormalizedArgon2Options): Argon2Options {
    return new Argon2Options()
        .setType(algorithm2Argon2Type(options.algorithm))
        .setTimeIterations(options.iterations)
        .setMemoryKib(options.memory)
        .setParallelism(options.parallelism);
}

export function parseProtobufArgon2Options(argon2Options: Argon2Options): NormalizedArgon2Options {
    return {
        algorithm: argon2Type2algorithm(
            argon2Options.getType(),
            argon2Options.hasType(),
            { fieldName: 'type', dataName },
        ),
        iterations: validateNumberField(
            argon2Options.getTimeIterations(),
            argon2Options.hasTimeIterations(),
            { fieldName: 'time_iterations', dataName },
        ),
        memory: validateNumberField(
            argon2Options.getMemoryKib(),
            argon2Options.hasMemoryKib(),
            { fieldName: 'memory_kib', dataName },
        ),
        parallelism: validateNumberField(
            argon2Options.getParallelism(),
            argon2Options.hasParallelism(),
            { fieldName: 'parallelism', dataName },
        ),
    };
}
