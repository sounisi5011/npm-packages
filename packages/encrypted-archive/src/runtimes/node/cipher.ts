import type { CryptoAlgorithmBuiltinAPI } from '../../core/types/crypto';
import { ase256gcm } from './cipher/aes-256-gcm';
import { chacha20Poly1305 } from './cipher/chacha20-poly1305';

export const cryptoAlgorithm: CryptoAlgorithmBuiltinAPI = {
    algorithmRecord: {
        'aes-256-gcm': ase256gcm,
        'chacha20-poly1305': chacha20Poly1305,
    },
    defaultAlgorithmName: 'chacha20-poly1305',
};
