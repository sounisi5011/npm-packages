export function validateDisallowedOptions(
    options: Record<PropertyKey, unknown>,
    disallowOptionNameList: readonly PropertyKey[],
    errorMessage = `The following compress options are not allowed: %s`,
): void {
    const disallowOptionList = disallowOptionNameList.filter(optName => optName in options);
    if (disallowOptionList.length > 0) {
        throw new Error(errorMessage.replace(/%s/g, disallowOptionList.join(', ')));
    }
}
