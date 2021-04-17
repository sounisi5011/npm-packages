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
        this.incrementFixedField(byteLength);

        const view = this.nonceByteView;

        view.setBigUint64(0, this.fixedFieldData, true);
        view.setBigUint64(fixedFieldByteLength, this.invocationCount, true);
        this.invocationCount += BigInt(1);

        return Buffer.from(view.buffer.slice(0, byteLength));
    }

    updateInvocation(prevNonce: Uint8Array): this {
        this.validateLength('prevNonce', prevNonce, minUpdateByteLength, maxByteLength);
        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        if (this.fixedFieldData < fixedFieldData) {
            this.fixedFieldData = fixedFieldData;
            this.invocationCount = invocationCount + BigInt(1);
        } else if (this.fixedFieldData === fixedFieldData && this.invocationCount <= invocationCount) {
            this.invocationCount = invocationCount + BigInt(1);
        }
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

    private incrementFixedField(nonceByteLength: number): void {
        const invocationFieldByteLength = nonceByteLength - fixedFieldByteLength;
        const maxInvocationCount = BigInt(2) ** BigInt(invocationFieldByteLength * 8);
        if (this.invocationCount < maxInvocationCount) return;
        if (MAX_FIXED_FIELD_COUNT <= this.fixedFieldData) {
            if (nonceByteLength < maxByteLength) {
                throw new Error(
                    `Unable to create nonce. All bits are overflowing. Please increase the nonce bytes from current value. Received ${nonceByteLength}`,
                );
            } else {
                throw new Error(`Unable to create nonce. All bits are overflowing.`);
            }
        }
        this.fixedFieldData += BigInt(1);
        this.invocationCount = BigInt(0);
    }

    private parseNonceBytes(nonceBytes: Uint8Array): { fixedFieldData: bigint; invocationCount: bigint } {
        const view = this.nonceByteView;
        for (let offset = 0; offset < view.byteLength; offset++) view.setUint8(offset, nonceBytes[offset] ?? 0);

        const fixedFieldData = BigInt.asUintN(
            fixedFieldByteLength * 8,
            view.getBigUint64(0, true),
        );
        const invocationCount = view.getBigUint64(fixedFieldByteLength, true);

        return { fixedFieldData, invocationCount };
    }
}
