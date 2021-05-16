/**
 * The maximum Unixtime for ECMAScript Date objects is 8,640,000,000,000,000 milliseconds.
 * This can be represented by 7 bytes of data.
 * @see https://262.ecma-international.org/10.0/#sec-time-values-and-time-range
 */
const fixedFieldByteLength = 7;

const minCreateByteLength = fixedFieldByteLength + 2;
const minUpdateByteLength = fixedFieldByteLength + 1;
const maxByteLength = fixedFieldByteLength + 64 / 8;

const MAX_FIXED_FIELD_COUNT = BigInt(2) ** BigInt(fixedFieldByteLength * 8) - BigInt(1);

/**
 * fixedFieldData (7 bytes unixtime) + invocationCount value ((byteLength - 7) bytes)
 */
export class Nonce {
    private fixedFieldData: bigint;
    private invocationCount: bigint;

    constructor() {
        this.fixedFieldData = BigInt(Date.now());
        this.invocationCount = BigInt(0);
    }

    create(byteLength: number): Buffer {
        this.validateLength({ byteLength }, minCreateByteLength, maxByteLength);
        return this.createNonceBytes({
            nonceByteLength: byteLength,
            fixedFieldData: this.fixedFieldData,
            invocationCount: this.invocationCount,
        });
    }

    createFromInvocationCountDiff(prevNonce: Buffer | Uint8Array, addInvocationCount: bigint): Buffer {
        this.validateLength({ prevNonce }, minUpdateByteLength, maxByteLength);
        this.validateMore({ addInvocationCount }, 1);

        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        return this.createNonceBytes({
            nonceByteLength: prevNonce.byteLength,
            fixedFieldData,
            invocationCount: invocationCount + addInvocationCount,
        });
    }

    createFromFixedFieldDiff(
        prevNonce: Buffer | Uint8Array,
        addFixedField: bigint,
        resetInvocationCount: bigint,
    ): Buffer {
        this.validateLength({ prevNonce }, minUpdateByteLength, maxByteLength);
        this.validateMore({ addFixedField }, 1);
        this.validateMore({ resetInvocationCount }, 0);

        const { fixedFieldData } = this.parseNonceBytes(prevNonce);
        return this.createNonceBytes({
            nonceByteLength: prevNonce.byteLength,
            fixedFieldData: fixedFieldData + addFixedField,
            invocationCount: resetInvocationCount,
        });
    }

    getDiff(
        prevNonce: Buffer | Uint8Array,
        currentNonce: Buffer | Uint8Array,
    ): { invocationCount: bigint } | { fixedField: bigint; resetInvocationCount: bigint } {
        this.validateLength({ prevNonce, currentNonce }, minUpdateByteLength, maxByteLength);

        const { fixedFieldData: prevFixedFieldData, invocationCount: prevInvocationCount } = this.parseNonceBytes(
            prevNonce,
        );
        const { fixedFieldData: currentFixedFieldData, invocationCount: currentInvocationCount } = this.parseNonceBytes(
            currentNonce,
        );

        if (currentFixedFieldData === prevFixedFieldData) {
            return { invocationCount: currentInvocationCount - prevInvocationCount };
        }
        return {
            fixedField: currentFixedFieldData - prevFixedFieldData,
            resetInvocationCount: currentInvocationCount,
        };
    }

    private validateMore(
        valueRecord: Record<string, number | bigint>,
        min: number | bigint,
    ): void {
        for (const [argName, value] of Object.entries(valueRecord)) {
            if (!(value >= min)) {
                throw new RangeError(
                    `The value of "${argName}" argument is out of range. It must be >= ${min}. Received ${value}`,
                );
            }
        }
    }

    private validateLength(
        valueRecord: Record<string, number | Uint8Array | Buffer>,
        minLength: number,
        maxLength: number,
    ): void {
        for (const [argName, value] of Object.entries(valueRecord)) {
            this.validateOneArgLength(argName, value, minLength, maxLength);
        }
    }

    private validateOneArgLength(
        argName: string,
        value: number | Uint8Array | Buffer,
        minLength: number,
        maxLength: number,
    ): void {
        const [shortMsg, longMsg, length] = typeof value === 'number'
            ? ['is too short', 'is too long', value]
            : ['has too short byte length', 'has too long byte length', value.byteLength];
        let shortOrLongMsg = '';
        if (length < minLength) shortOrLongMsg = shortMsg;
        if (length > maxLength) shortOrLongMsg = longMsg;
        if (shortOrLongMsg) {
            throw new RangeError(
                `The value of "${argName}" argument ${shortOrLongMsg}.`
                    + ` It must be >= ${minLength} and <= ${maxLength}. Received ${length}`,
            );
        }
    }

    private createNonceBytes(
        { nonceByteLength, fixedFieldData, invocationCount }: {
            nonceByteLength: number;
            fixedFieldData: bigint;
            invocationCount: bigint;
        },
    ): Buffer {
        const invocationFieldByteLength = nonceByteLength - fixedFieldByteLength;
        const newInvocationCount = invocationCount & (BigInt(2) ** BigInt(invocationFieldByteLength * 8) - BigInt(1));
        const newFixedFieldData = fixedFieldData + (invocationCount >> BigInt(invocationFieldByteLength * 8));
        if (MAX_FIXED_FIELD_COUNT < newFixedFieldData) {
            throw new Error(
                `Unable to create nonce. All bits are overflowing.${
                    nonceByteLength < maxByteLength
                        ? ` Please increase the nonce bytes from current value. Received ${nonceByteLength}`
                        : ''
                }`,
            );
        }

        const newNonce = Buffer.alloc(nonceByteLength);
        for (let index = 0; index < fixedFieldByteLength; index++) {
            newNonce[index] = Number(
                newFixedFieldData >> BigInt(index * 8) & BigInt(0xFF),
            );
        }
        for (let index = 0; index < invocationFieldByteLength; index++) {
            newNonce[fixedFieldByteLength + index] = Number(
                newInvocationCount >> BigInt(index * 8) & BigInt(0xFF),
            );
        }

        this.updateState({ newFixedFieldData, newInvocationCount });
        return newNonce;
    }

    private parseNonceBytes(nonceBytes: Uint8Array | Buffer): { fixedFieldData: bigint; invocationCount: bigint } {
        let fixedFieldData = BigInt(0);
        let invocationCount = BigInt(0);

        nonceBytes.forEach((byteCode, index) => {
            if (index < fixedFieldByteLength) {
                fixedFieldData |= BigInt(byteCode) << BigInt(index * 8);
            } else {
                invocationCount |= BigInt(byteCode) << BigInt((index - fixedFieldByteLength) * 8);
            }
        });

        this.updateState({
            newFixedFieldData: fixedFieldData,
            newInvocationCount: invocationCount,
        });
        return { fixedFieldData, invocationCount };
    }

    private updateState(
        { newFixedFieldData, newInvocationCount }: Record<'newFixedFieldData' | 'newInvocationCount', bigint>,
    ): void {
        if (this.fixedFieldData <= newFixedFieldData) {
            if (this.fixedFieldData < newFixedFieldData) {
                this.fixedFieldData = newFixedFieldData;
                this.invocationCount = newInvocationCount + BigInt(1);
            } else if (this.invocationCount <= newInvocationCount) {
                this.invocationCount = newInvocationCount + BigInt(1);
            }
        }
    }
}

export const nonceState = new Nonce();
