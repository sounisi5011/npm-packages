// package: 
// file: header.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Argon2Options extends jspb.Message { 

    hasType(): boolean;
    clearType(): void;
    getType(): Argon2Options.Argon2Type | undefined;
    setType(value: Argon2Options.Argon2Type): Argon2Options;

    hasTimeIterations(): boolean;
    clearTimeIterations(): void;
    getTimeIterations(): number | undefined;
    setTimeIterations(value: number): Argon2Options;

    hasMemoryKib(): boolean;
    clearMemoryKib(): void;
    getMemoryKib(): number | undefined;
    setMemoryKib(value: number): Argon2Options;

    hasParallelism(): boolean;
    clearParallelism(): void;
    getParallelism(): number | undefined;
    setParallelism(value: number): Argon2Options;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Argon2Options.AsObject;
    static toObject(includeInstance: boolean, msg: Argon2Options): Argon2Options.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Argon2Options, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Argon2Options;
    static deserializeBinaryFromReader(message: Argon2Options, reader: jspb.BinaryReader): Argon2Options;
}

export namespace Argon2Options {
    export type AsObject = {
        type?: Argon2Options.Argon2Type,
        timeIterations?: number,
        memoryKib?: number,
        parallelism?: number,
    }

    export enum Argon2Type {
    ARGON2D = 0,
    ARGON2ID = 1,
    }

}

export class Header extends jspb.Message { 

    hasCryptoNonce(): boolean;
    clearCryptoNonce(): void;
    getCryptoNonce(): Uint8Array | string;
    getCryptoNonce_asU8(): Uint8Array;
    getCryptoNonce_asB64(): string;
    setCryptoNonce(value: Uint8Array | string): Header;

    hasCryptoAuthTag(): boolean;
    clearCryptoAuthTag(): void;
    getCryptoAuthTag(): Uint8Array | string;
    getCryptoAuthTag_asU8(): Uint8Array;
    getCryptoAuthTag_asB64(): string;
    setCryptoAuthTag(value: Uint8Array | string): Header;

    hasCryptoAlgorithm(): boolean;
    clearCryptoAlgorithm(): void;
    getCryptoAlgorithm(): Header.CryptoAlgorithm | undefined;
    setCryptoAlgorithm(value: Header.CryptoAlgorithm): Header;

    hasKeySalt(): boolean;
    clearKeySalt(): void;
    getKeySalt(): Uint8Array | string;
    getKeySalt_asU8(): Uint8Array;
    getKeySalt_asB64(): string;
    setKeySalt(value: Uint8Array | string): Header;

    hasKeyLength(): boolean;
    clearKeyLength(): void;
    getKeyLength(): number | undefined;
    setKeyLength(value: number): Header;

    hasArgon2KeyOptions(): boolean;
    clearArgon2KeyOptions(): void;
    getArgon2KeyOptions(): Argon2Options | undefined;
    setArgon2KeyOptions(value?: Argon2Options): Header;

    hasCompressAlgorithm(): boolean;
    clearCompressAlgorithm(): void;
    getCompressAlgorithm(): Header.CompressAlgorithm | undefined;
    setCompressAlgorithm(value: Header.CompressAlgorithm): Header;

    getKeyOptionsCase(): Header.KeyOptionsCase;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): Header.AsObject;
    static toObject(includeInstance: boolean, msg: Header): Header.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: Header, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): Header;
    static deserializeBinaryFromReader(message: Header, reader: jspb.BinaryReader): Header;
}

export namespace Header {
    export type AsObject = {
        cryptoNonce: Uint8Array | string,
        cryptoAuthTag: Uint8Array | string,
        cryptoAlgorithm?: Header.CryptoAlgorithm,
        keySalt: Uint8Array | string,
        keyLength?: number,
        argon2KeyOptions?: Argon2Options.AsObject,
        compressAlgorithm?: Header.CompressAlgorithm,
    }

    export enum CryptoAlgorithm {
    AES_256_GCM = 0,
    CHACHA20_POLY1305 = 1,
    }

    export enum CompressAlgorithm {
    NONE = 0,
    GZIP = 1,
    BROTLI = 2,
    }


    export enum KeyOptionsCase {
        KEY_OPTIONS_NOT_SET = 0,
        ARGON2_KEY_OPTIONS = 15,
    }

}

export class SimpleHeader extends jspb.Message { 

    hasCryptoAuthTag(): boolean;
    clearCryptoAuthTag(): void;
    getCryptoAuthTag(): Uint8Array | string;
    getCryptoAuthTag_asU8(): Uint8Array;
    getCryptoAuthTag_asB64(): string;
    setCryptoAuthTag(value: Uint8Array | string): SimpleHeader;
    getCryptoNonceCounterAddOrReset(): string;
    setCryptoNonceCounterAddOrReset(value: string): SimpleHeader;
    getCryptoNonceFixedAdd(): string;
    setCryptoNonceFixedAdd(value: string): SimpleHeader;

    serializeBinary(): Uint8Array;
    toObject(includeInstance?: boolean): SimpleHeader.AsObject;
    static toObject(includeInstance: boolean, msg: SimpleHeader): SimpleHeader.AsObject;
    static extensions: {[key: number]: jspb.ExtensionFieldInfo<jspb.Message>};
    static extensionsBinary: {[key: number]: jspb.ExtensionFieldBinaryInfo<jspb.Message>};
    static serializeBinaryToWriter(message: SimpleHeader, writer: jspb.BinaryWriter): void;
    static deserializeBinary(bytes: Uint8Array): SimpleHeader;
    static deserializeBinaryFromReader(message: SimpleHeader, reader: jspb.BinaryReader): SimpleHeader;
}

export namespace SimpleHeader {
    export type AsObject = {
        cryptoAuthTag: Uint8Array | string,
        cryptoNonceCounterAddOrReset: string,
        cryptoNonceFixedAdd: string,
    }
}
