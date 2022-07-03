import type { KDFBuiltinAPIRecord } from '../../core/types/key-derivation-function';
import { argon2Hash } from './key-derivation-function/argon2';

export const kdfBuiltinRecord: KDFBuiltinAPIRecord = {
    argon2Hash,
};
