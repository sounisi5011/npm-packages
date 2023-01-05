export function number2hex(template: TemplateStringsArray, ...substitutions: number[]): string {
    return template
        .map((str, index) => {
            if (index === 0) return str;
            const value = substitutions[index - 1];
            if (typeof value === 'number') {
                const hexStr = value.toString(16).toUpperCase();
                const hexLen = hexStr.length + hexStr.length % 2;
                return `0x${hexStr.padStart(hexLen, '0')}${str}`;
            }
            return String(value) + str;
        })
        .join('');
}
