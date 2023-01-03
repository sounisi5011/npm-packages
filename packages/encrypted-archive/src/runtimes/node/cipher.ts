import type { CryptoAlgorithmBuiltinAPI } from '../../core/types/crypto';
import * as ase256gcm from './cipher/aes-256-gcm';
import * as chacha20Poly1305 from './cipher/chacha20-poly1305';

export const algorithmRecord: CryptoAlgorithmBuiltinAPI['algorithmRecord'] = {
    'aes-256-gcm': ase256gcm,
    'chacha20-poly1305': chacha20Poly1305,
};

export const defaultAlgorithmName: CryptoAlgorithmBuiltinAPI['defaultAlgorithmName'] = 'chacha20-poly1305';
