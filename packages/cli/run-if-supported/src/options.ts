export interface ParsedArgs {
    options: Map<string, string[]>;
    command?: string;
    commandArgs: string[];
}

function mergeOptionValue<T>(
    prevValue: T[] | undefined,
    newValue?: T,
): T[] {
    const prevValueArray = prevValue ?? [];
    return typeof newValue === 'string' ? prevValueArray.concat(newValue) : prevValueArray;
}

function parseLongOption(
    arg: string,
    callbackFn: (
        optionName: string,
        optionValue: string | undefined,
    ) => void,
): boolean {
    const longOptionMatch = arg.match(/^--+([^=]*)(?:=(.*))?$/s);
    if (longOptionMatch) {
        const [, optionName, optionValue] = longOptionMatch;
        if (!optionName) throw new Error(`Invalid option \`${arg}\``);
        callbackFn(`--${optionName}`, optionValue);
        return true;
    }
    return false;
}

function parseShortOption(
    arg: string,
    callbackFn: (optionName: string) => void,
): boolean {
    const shortOptionMatch = arg.match(/^-(.*)$/s);
    if (shortOptionMatch) {
        const [, optionNameChars] = shortOptionMatch;
        if (!optionNameChars) throw new Error(`Invalid option \`${arg}\``);

        for (const optionName of optionNameChars) callbackFn(`-${optionName}`);
        return true;
    }
    return false;
}

export function parseOptions(
    argv: readonly string[],
    hasValueOptions: readonly string[] = [],
): ParsedArgs {
    const { options, command, commandArgs } = argv.reduce<ParsedArgs & { waitValueOptionName?: string }>(
        ({ options, command, commandArgs, waitValueOptionName }, arg) => {
            if (command !== undefined) {
                commandArgs.push(arg);
            } else if (
                parseLongOption(arg, (optionName, optionValue) => {
                    options.set(optionName, mergeOptionValue(options.get(optionName), optionValue));
                    waitValueOptionName = typeof optionValue === 'string' ? undefined : optionName;
                })
            ) {
                //
            } else if (
                parseShortOption(arg, optionName => {
                    options.set(optionName, mergeOptionValue(options.get(optionName)));
                    waitValueOptionName = optionName;
                })
            ) {
                //
            } else if (waitValueOptionName !== undefined && hasValueOptions.includes(waitValueOptionName)) {
                const optionName = waitValueOptionName;
                const optionValue = arg;
                options.set(optionName, mergeOptionValue(options.get(optionName), optionValue));
                waitValueOptionName = undefined;
            } else {
                command = arg;
                waitValueOptionName = undefined;
            }
            return { options, command, commandArgs, waitValueOptionName };
        },
        { options: new Map(), commandArgs: [] },
    );
    return { options, command, commandArgs };
}
