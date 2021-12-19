import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR = `The package '@sounisi5011/encrypted-archive' doesn't seem to be linked. Make sure: \n\n`
    + Platform.select({ ios: "- You have run 'pod install'\n", default: '' })
    + '- You rebuilt the app after installing the package\n'
    + '- You are not using Expo managed workflow\n';

const EncryptedArchive = NativeModules.EncryptedArchive
    ? NativeModules.EncryptedArchive
    : new Proxy(
        {},
        {
            get() {
                throw new Error(LINKING_ERROR);
            },
        },
    );

export function multiply(a: number, b: number): Promise<number> {
    return EncryptedArchive.multiply(a, b);
}
