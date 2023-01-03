import type { CryptoAlgorithmBuiltinAPIRecord } from '../../core/types/crypto';
import * as ase256gcm from './cipher/aes-256-gcm';
import * as chacha20Poly1305 from './cipher/chacha20-poly1305';

export const cryptoAlgorithmBuiltinRecord: CryptoAlgorithmBuiltinAPIRecord = {
    'aes-256-gcm': ase256gcm,
    'chacha20-poly1305': chacha20Poly1305,
};
