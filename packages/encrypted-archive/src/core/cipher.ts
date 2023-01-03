import type { BuiltinInspectRecord } from './types/builtin';
import type { CryptoAlgorithmBuiltinAPIRecord, CryptoAlgorithmData, CryptoAlgorithmName } from './types/crypto';
import { cryptoAlgorithmNameList, defaultCryptoAlgorithmName } from './types/crypto';
import { passThroughString } from './utils';

export type CryptoAlgorithmDataWithAlgorithmName =
    & CryptoAlgorithmData
    & { readonly algorithmName: CryptoAlgorithmName };

/**
 * @throws {TypeError}
 * @throws {RangeError}
 */
export function getCryptoAlgorithm(
    builtin: { cryptoAlgorithmRecord: CryptoAlgorithmBuiltinAPIRecord } & BuiltinInspectRecord,
    algorithmName: CryptoAlgorithmName | undefined,
): CryptoAlgorithmDataWithAlgorithmName {
    if (algorithmName === undefined) {
        algorithmName = defaultCryptoAlgorithmName;
    }
    if (algorithmName !== undefined && !cryptoAlgorithmNameList.includes(algorithmName)) {
        throw new TypeError(`Unknown algorithm was received: ${passThroughString(builtin.inspect, algorithmName)}`);
    }

    const cryptoAlgorithmRecord = builtin.cryptoAlgorithmRecord;
    const algorithm = cryptoAlgorithmRecord[algorithmName];
    if (algorithm) return { algorithmName, ...algorithm };

    const supportedAlgorithmMsg = cryptoAlgorithmNameList
        .filter(algorithmName => Boolean(cryptoAlgorithmRecord[algorithmName]))
        .map(algorithmName => `"${algorithmName}"`)
        .join(', ');
    throw new RangeError(
        'Unsupported algorithm was passed.'
            + ` Encryption algorithm "${algorithmName}" is not supported on this environment; it should be one of ${supportedAlgorithmMsg}`,
    );
}
