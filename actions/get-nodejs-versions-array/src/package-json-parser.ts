import parseJson from 'parse-json';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

const packageJsonSchema = z.object({
    engines: z.object({
        node: z.string(),
    }),
});

/**
 * @throws {import('parse-json').JSONError} If an invalid JSON string is passed, this error will be thrown from within `parse-json` package
 * @throws {import('zod-validation-error').ValidationError} If the structure of the JSON is not as expected, this error will be thrown
 */
export function parsePackageJson(pkgJsonText: string, pkgJsonFilename: string): z.infer<typeof packageJsonSchema> {
    const pkgJsonObject = parseJson(pkgJsonText, pkgJsonFilename);
    const validationResult = packageJsonSchema.safeParse(pkgJsonObject);
    if (validationResult.success) return validationResult.data;

    const validationError = fromZodError(validationResult.error, {
        prefix: 'Invalid "package.json" file detected',
    });
    validationError.message += ` in '${pkgJsonFilename}'`;
    throw validationError;
}

export function isJSONErrorLike(error: unknown): error is Error {
    return error instanceof Error && error.name === 'JSONError';
}
