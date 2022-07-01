import type { GetCryptoAlgorithm } from '../../core/types/crypto';
import * as ase256gcm from './cipher/aes-256-gcm';
import * as chacha20Poly1305 from './cipher/chacha20-poly1305';

const cryptoAlgorithmRecord = {
    [ase256gcm.algorithmName]: ase256gcm,
    [chacha20Poly1305.algorithmName]: chacha20Poly1305,
};

export const getCryptoAlgorithm: GetCryptoAlgorithm = algorithmName =>
    cryptoAlgorithmRecord[algorithmName] || undefined;
