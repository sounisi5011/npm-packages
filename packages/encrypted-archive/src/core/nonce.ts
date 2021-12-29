/**
 * The maximum Unixtime for ECMAScript Date objects is 8,640,000,000,000,000 milliseconds.
 * This can be represented by 7 bytes of data.
 * @see https://262.ecma-international.org/10.0/#sec-time-values-and-time-range
 */
const FIXED_FIELD_BYTE_LENGTH = 7;

const MIN_CREATE_BYTE_LENGTH = FIXED_FIELD_BYTE_LENGTH + 2;
const MIN_UPDATE_BYTE_LENGTH = FIXED_FIELD_BYTE_LENGTH + 1;
const MAX_BYTE_LENGTH = FIXED_FIELD_BYTE_LENGTH + 64 / 8;

const MAX_FIXED_FIELD_COUNT = BigInt(2) ** BigInt(FIXED_FIELD_BYTE_LENGTH * 8) - BigInt(1);

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

    create(byteLength: number): Uint8Array {
        this.validateLength({ byteLength }, MIN_CREATE_BYTE_LENGTH, MAX_BYTE_LENGTH);
        return this.createNonceBytes({
            nonceByteLength: byteLength,
            fixedFieldData: this.fixedFieldData,
            invocationCount: this.invocationCount,
        });
    }

    createFromInvocationCountDiff(prevNonce: Uint8Array, addInvocationCount: bigint): Uint8Array {
        this.validateLength({ prevNonce }, MIN_UPDATE_BYTE_LENGTH, MAX_BYTE_LENGTH);
        this.validateMore({ addInvocationCount }, 1);

        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        return this.createNonceBytes({
            nonceByteLength: prevNonce.byteLength,
            fixedFieldData,
            invocationCount: invocationCount + addInvocationCount,
        });
    }

    createFromFixedFieldDiff(
        prevNonce: Uint8Array,
        addFixedField: bigint,
        resetInvocationCount: bigint,
    ): Uint8Array {
        this.validateLength({ prevNonce }, MIN_UPDATE_BYTE_LENGTH, MAX_BYTE_LENGTH);
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
        prevNonce: Uint8Array,
        currentNonce: Uint8Array,
    ): { invocationCount: bigint } | { fixedField: bigint; resetInvocationCount: bigint } {
        this.validateLength({ prevNonce, currentNonce }, MIN_UPDATE_BYTE_LENGTH, MAX_BYTE_LENGTH);

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
        valueRecord: Record<string, number | Uint8Array>,
        minLength: number,
        maxLength: number,
    ): void {
        for (const [argName, value] of Object.entries(valueRecord)) {
            this.validateOneArgLength(argName, value, minLength, maxLength);
        }
    }

    private validateOneArgLength(
        argName: string,
        value: number | Uint8Array,
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
    ): Uint8Array {
        const invocationFieldByteLength = nonceByteLength - FIXED_FIELD_BYTE_LENGTH;
        const newInvocationCount = invocationCount & (BigInt(2) ** BigInt(invocationFieldByteLength * 8) - BigInt(1));
        const newFixedFieldData = fixedFieldData + (invocationCount >> BigInt(invocationFieldByteLength * 8));
        if (MAX_FIXED_FIELD_COUNT < newFixedFieldData) {
            throw new Error(
                `Unable to create nonce. All bits are overflowing.${
                    nonceByteLength < MAX_BYTE_LENGTH
                        ? ` Please increase the nonce bytes from current value. Received ${nonceByteLength}`
                        : ''
                }`,
            );
        }

        const newNonce = new Uint8Array(nonceByteLength);
        for (let index = 0; index < FIXED_FIELD_BYTE_LENGTH; index++) {
            newNonce[index] = Number(
                newFixedFieldData >> BigInt(index * 8) & BigInt(0xFF),
            );
        }
        for (let index = 0; index < invocationFieldByteLength; index++) {
            newNonce[FIXED_FIELD_BYTE_LENGTH + index] = Number(
                newInvocationCount >> BigInt(index * 8) & BigInt(0xFF),
            );
        }

        this.updateState({ newFixedFieldData, newInvocationCount });
        return newNonce;
    }

    private parseNonceBytes(nonceBytes: Uint8Array): { fixedFieldData: bigint; invocationCount: bigint } {
        let fixedFieldData = BigInt(0);
        let invocationCount = BigInt(0);

        nonceBytes.forEach((byteCode, index) => {
            if (index < FIXED_FIELD_BYTE_LENGTH) {
                fixedFieldData |= BigInt(byteCode) << BigInt(index * 8);
            } else {
                invocationCount |= BigInt(byteCode) << BigInt((index - FIXED_FIELD_BYTE_LENGTH) * 8);
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
