/**
 * The maximum Unixtime for ECMAScript Date objects is 8,640,000,000,000,000 milliseconds.
 * This can be represented by 7 bytes of data.
 * @see https://262.ecma-international.org/10.0/#sec-time-values-and-time-range
 */
const fixedFieldByteLength = 7;

const minByteLength = fixedFieldByteLength + 2;

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
        if (byteLength < minByteLength) {
            throw new TypeError(
                `The value of "byteLength" argument is too short. It must be >= ${minByteLength}. Received ${byteLength}`,
            );
        }

        const buffer = new ArrayBuffer(fixedFieldByteLength + 64 / 8);
        const view = new DataView(buffer);

        view.setBigUint64(0, this.fixedFieldData, true);
        view.setBigUint64(fixedFieldByteLength, this.invocationCount, true);
        this.invocationCount += BigInt(1);

        return Buffer.from(buffer, 0, byteLength);
    }

    updateInvocation(prevNonce: Uint8Array): this {
        const { fixedFieldData, invocationCount } = this.parseNonceBytes(prevNonce);
        if (this.fixedFieldData < fixedFieldData) {
            this.fixedFieldData = fixedFieldData;
            this.invocationCount = invocationCount + BigInt(1);
        } else if (this.fixedFieldData === fixedFieldData && this.invocationCount <= invocationCount) {
            this.invocationCount = invocationCount + BigInt(1);
        }
        return this;
    }

    private parseNonceBytes(nonceBytes: Uint8Array): { fixedFieldData: bigint; invocationCount: bigint } {
        const invocationFieldByteLength = nonceBytes.byteLength - fixedFieldByteLength;
        if (invocationFieldByteLength < 1) {
            throw new TypeError(
                `The value of "nonceBytes" argument has too short byte length.`
                    + ` It must be >= ${fixedFieldByteLength + 1}. Received ${nonceBytes.byteLength}`,
            );
        }

        const view = new DataView(nonceBytes.buffer, nonceBytes.byteOffset);
        const fixedFieldData = BigInt.asUintN(
            fixedFieldByteLength * 8,
            view.getBigUint64(0, true),
        );
        const invocationCount = BigInt.asUintN(
            invocationFieldByteLength * 8,
            view.getBigUint64(fixedFieldByteLength, true),
        );

        return { fixedFieldData, invocationCount };
    }
}
