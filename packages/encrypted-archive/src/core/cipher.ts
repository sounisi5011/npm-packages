import type { BuiltinInspectRecord } from './types/builtin';
import type { CryptoAlgorithmBuiltinAPI, CryptoAlgorithmData, CryptoAlgorithmName } from './types/crypto';
import { cryptoAlgorithmNameList } from './types/crypto';
import { passThroughString } from './utils';

export type CryptoAlgorithmDataWithAlgorithmName =
    & CryptoAlgorithmData
    & { readonly algorithmName: CryptoAlgorithmName };

/**
 * @throws {TypeError}
 * @throws {RangeError}
 */
export function getCryptoAlgorithm(
    builtin: { cryptoAlgorithm: CryptoAlgorithmBuiltinAPI } & BuiltinInspectRecord,
    algorithmName: CryptoAlgorithmName | undefined,
): CryptoAlgorithmDataWithAlgorithmName {
    const { algorithmRecord, defaultAlgorithmName } = builtin.cryptoAlgorithm;

    if (algorithmName === undefined) {
        algorithmName = defaultAlgorithmName;
    }
    if (algorithmName !== undefined && !cryptoAlgorithmNameList.includes(algorithmName)) {
        throw new TypeError(`Unknown algorithm was received: ${passThroughString(builtin.inspect, algorithmName)}`);
    }

    const algorithm = algorithmRecord[algorithmName];
    if (algorithm) return { algorithmName, ...algorithm };

    const supportedAlgorithmMsg = cryptoAlgorithmNameList
        .filter(algorithmName => Boolean(algorithmRecord[algorithmName]))
        .map(algorithmName => `"${algorithmName}"`)
        .join(', ');
    throw new RangeError(
        'Unsupported algorithm was passed.'
            + ` Encryption algorithm "${algorithmName}" is not supported on this environment; it should be one of ${supportedAlgorithmMsg}`,
    );
}
