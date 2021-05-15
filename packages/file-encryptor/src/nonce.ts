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
    private readonly nonceByteView = new DataView(new ArrayBuffer(maxByteLength));

    constructor() {
        this.fixedFieldData = BigInt(Date.now());
        this.invocationCount = BigInt(0);
    }

    create(byteLength: number): Buffer {
        this.validateLength('byteLength', byteLength, minCreateByteLength, maxByteLength);
        return this.createNonceBytes({
            nonceByteLength: byteLength,
            fixedFieldData: this.fixedFieldData,
            invocationCount: this.invocationCount,
        }).nonce;
    }

    createFromInvocationCountDiff(prevNonce: Buffer | Uint8Array, addInvocationCount: bigint): Buffer {
        this.validateLength('prevNonce', prevNonce, minUpdateByteLength, maxByteLength);
        if (!(addInvocationCount >= 1)) {
            throw new RangeError(
                `The value of "addInvocationCount" argument is out of range. It must be >= 1. Received ${addInvocationCount}`,
            );
        }

        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        return this.createNonceBytes({
            nonceByteLength: prevNonce.byteLength,
            fixedFieldData,
            invocationCount: invocationCount + addInvocationCount,
        }).nonce;
    }

    createFromFixedFieldDiff(
        prevNonce: Buffer | Uint8Array,
        addFixedField: bigint,
        resetInvocationCount: bigint,
    ): Buffer {
        this.validateLength('prevNonce', prevNonce, minUpdateByteLength, maxByteLength);
        if (!(addFixedField >= 1)) {
            throw new RangeError(
                `The value of "addFixedField" argument is out of range. It must be >= 1. Received ${addFixedField}`,
            );
        }
        if (!(resetInvocationCount >= 0)) {
            throw new RangeError(
                `The value of "resetInvocationCount" argument is out of range. It must be >= 0. Received ${resetInvocationCount}`,
            );
        }

        const { fixedFieldData } = this.parseNonceBytes(prevNonce);
        return this.createNonceBytes({
            nonceByteLength: prevNonce.byteLength,
            fixedFieldData: fixedFieldData + addFixedField,
            invocationCount: resetInvocationCount,
        }).nonce;
    }

    getDiff(
        prevNonce: Buffer | Uint8Array,
        currentNonce: Buffer | Uint8Array,
    ): { invocationCount: bigint } | { fixedField: bigint; resetInvocationCount: bigint } {
        this.validateLength('prevNonce', prevNonce, minUpdateByteLength, maxByteLength);
        this.validateLength('prevNonce', currentNonce, minUpdateByteLength, maxByteLength);

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

    updateInvocation(prevNonce: Uint8Array): this {
        this.validateLength('prevNonce', prevNonce, minUpdateByteLength, maxByteLength);
        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        this.updateState({
            newFixedFieldData: fixedFieldData,
            newInvocationCount: invocationCount,
        });
        return this;
    }

    private validateLength(argName: string, value: number | Uint8Array, minLength: number, maxLength: number): void {
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
    ): { nonce: Buffer; newFixedFieldData: bigint; newInvocationCount: bigint } {
        const invocationFieldByteLength = nonceByteLength - fixedFieldByteLength;
        const invocationFieldBits = BigInt(invocationFieldByteLength * 8);
        const maxInvocationFieldCount = BigInt(2) ** invocationFieldBits - BigInt(1);

        const newInvocationCount = invocationCount & maxInvocationFieldCount;
        const newFixedFieldData = fixedFieldData + (invocationCount >> invocationFieldBits);
        if (MAX_FIXED_FIELD_COUNT < newFixedFieldData) {
            if (nonceByteLength < maxByteLength) {
                throw new Error(
                    `Unable to create nonce. All bits are overflowing. Please increase the nonce bytes from current value. Received ${nonceByteLength}`,
                );
            } else {
                throw new Error(`Unable to create nonce. All bits are overflowing.`);
            }
        }

        const newNonce = Buffer.alloc(nonceByteLength);
        for (let i = 0; i < fixedFieldByteLength; i++) {
            newNonce[i] = Number(
                (newFixedFieldData >> BigInt(i * 8)) & BigInt(0xFF),
            );
        }
        for (let i = 0; i < invocationFieldByteLength; i++) {
            newNonce[fixedFieldByteLength + i] = Number(
                (newInvocationCount >> BigInt(i * 8)) & BigInt(0xFF),
            );
        }

        this.updateState({ newFixedFieldData, newInvocationCount });

        return {
            nonce: newNonce,
            newFixedFieldData,
            newInvocationCount,
        };
    }

    private parseNonceBytes(nonceBytes: Uint8Array): { fixedFieldData: bigint; invocationCount: bigint } {
        const view = this.nonceByteView;
        for (let offset = 0; offset < view.byteLength; offset++) view.setUint8(offset, nonceBytes[offset] ?? 0);

        const fixedFieldData = BigInt.asUintN(
            fixedFieldByteLength * 8,
            view.getBigUint64(0, true),
        );
        const invocationCount = view.getBigUint64(fixedFieldByteLength, true);

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
