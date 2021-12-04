export interface ParsedArgs {
    options: Map<string, string[]>;
    command?: string | undefined;
    commandArgs: string[];
}

function mergeOptionValue<T extends string>(
    prevValue: T[] | undefined,
    newValue?: T,
): T[] {
    const prevValueArray = prevValue ?? [];
    return typeof newValue === 'string' ? prevValueArray.concat(newValue) : prevValueArray;
}

function parseLongOption(
    option: string,
    callbackFn: (
        optionName: string,
        optionValue: string | undefined,
    ) => void,
): void {
    const equalsSignIndex = option.indexOf('=');
    if (equalsSignIndex < 0) {
        const optionName = option;
        callbackFn(`--${optionName}`, undefined);
    } else {
        const optionName = option.substring(0, equalsSignIndex);
        const optionValue = option.substring(equalsSignIndex + 1);
        callbackFn(`--${optionName}`, optionValue);
    }
}

function parseShortOption(
    option: string,
    callbackFn: (optionName: string) => void,
): void {
    for (const optionNameChar of option) callbackFn(`-${optionNameChar}`);
}

function processOption(
    arg: string,
    callback: (
        optionName: string,
        optionValue?: string,
    ) => void,
): void {
    const match = arg.match(/^(-+)(.*)$/s);
    if (!match) throw new Error(`Invalid option \`${arg}\``);

    const [, hyphen, option] = match;
    if (!hyphen || !option) throw new Error(`Invalid option \`${arg}\``);

    if (hyphen.length === 1) {
        parseShortOption(option, callback);
    } else {
        parseLongOption(option, callback);
    }
}

export function parseOptions(
    argv: readonly string[],
    hasValueOptions: readonly string[] = [],
): ParsedArgs {
    const { options, command, commandArgs } = argv.reduce<ParsedArgs & { waitValueOptionName?: string | undefined }>(
        ({ options, command, commandArgs, waitValueOptionName }, arg) => {
            if (command !== undefined) {
                commandArgs.push(arg);
            } else if (arg.startsWith('-')) {
                processOption(arg, (optionName, optionValue) => {
                    options.set(optionName, mergeOptionValue(options.get(optionName), optionValue));
                    waitValueOptionName = typeof optionValue === 'string' ? undefined : optionName;
                });
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
