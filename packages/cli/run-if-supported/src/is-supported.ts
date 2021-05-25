import { checkEngine, checkPlatform } from 'npm-install-checks';

import { isRecordLike, isString } from './utils';

function readProp<T>(
    obj: unknown,
    prop: string,
    validate: (value: unknown) => value is T,
): T | null {
    if (isRecordLike(obj)) {
        const value = obj[prop];
        if (validate(value)) return value;
    }
    return null;
}

function validateError<T>(error: unknown, fn: (error: Error & Record<PropertyKey, unknown>) => T): T {
    if (error instanceof Error && isRecordLike(error)) return fn(error);
    throw error;
}

function createRequiredPlatformText(error: Error & Record<PropertyKey, unknown>): string {
    if (!isRecordLike(error['current']) || !isRecordLike(error['required'])) return '';
    return Object.entries(error['current'])
        .flatMap(([prop, currentPlatform]): string[] => {
            if (!isString(currentPlatform)) return [];
            const requiredPlatformList = (
                readProp(error['required'], prop, Array.isArray)
                    ?? [readProp(error['required'], prop, isString)]
            ).filter(isString);
            if (requiredPlatformList.length < 1) return [];
            return [
                `${prop}:`,
                `  current: ${currentPlatform}`,
                `  required:`,
                ...requiredPlatformList.map(platform => `    - ${/\s|^$/.test(platform) ? `"${platform}"` : platform}`),
            ];
        })
        .map(line => `  ${line}`)
        .join('\n');
}

export function isNotSupported(
    pkg: Record<string, unknown>,
    nodeVersion: string,
): string | false {
    try {
        checkEngine(pkg, null, nodeVersion);
    } catch (error: unknown) {
        return validateError(error, error => {
            if (error['code'] !== 'EBADENGINE') throw error;
            const nodeRange = readProp(error['required'], 'node', isString);
            return `Node ${nodeVersion} is not included in supported range${nodeRange ? `: ${nodeRange}` : ''}`;
        });
    }
    try {
        checkPlatform(pkg);
    } catch (error: unknown) {
        return validateError(error, error => {
            if (error['code'] !== 'EBADPLATFORM') throw error;
            const requiredPlatform = createRequiredPlatformText(error);
            return `Current platform is not included in supported list${
                requiredPlatform ? `:\n${requiredPlatform}` : ''
            }`;
        });
    }
    return false;
}
