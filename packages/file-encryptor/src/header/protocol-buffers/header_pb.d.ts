// package: 
// file: header.proto

/* tslint:disable */
/* eslint-disable */

import * as jspb from "google-protobuf";

export class Argon2Options extends jspb.Message { 
    getType(): Argon2Options.Argon2Type;
    setType(value: Argon2Options.Argon2Type): Argon2Options;
    getTimeIterations(): number;
    setTimeIterations(value: number): Argon2Options;
    getMemoryKib(): number;
    setMemoryKib(value: number): Argon2Options;
    getParallelism(): number;
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
        type: Argon2Options.Argon2Type,
        timeIterations: number,
        memoryKib: number,
        parallelism: number,
    }

    export enum Argon2Type {
    ARGON2D = 0,
    ARGON2ID = 1,
    }

}

export class Header extends jspb.Message { 
    getCryptNonce(): Uint8Array | string;
    getCryptNonce_asU8(): Uint8Array;
    getCryptNonce_asB64(): string;
    setCryptNonce(value: Uint8Array | string): Header;
    getCryptAuthTag(): Uint8Array | string;
    getCryptAuthTag_asU8(): Uint8Array;
    getCryptAuthTag_asB64(): string;
    setCryptAuthTag(value: Uint8Array | string): Header;
    getCryptAlgorithm(): Header.CryptAlgorithm;
    setCryptAlgorithm(value: Header.CryptAlgorithm): Header;
    getKeySalt(): Uint8Array | string;
    getKeySalt_asU8(): Uint8Array;
    getKeySalt_asB64(): string;
    setKeySalt(value: Uint8Array | string): Header;
    getKeyLength(): number;
    setKeyLength(value: number): Header;

    hasArgon2KeyOptions(): boolean;
    clearArgon2KeyOptions(): void;
    getArgon2KeyOptions(): Argon2Options | undefined;
    setArgon2KeyOptions(value?: Argon2Options): Header;
    getCompressAlgorithm(): Header.CompressAlgorithm;
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
        cryptNonce: Uint8Array | string,
        cryptAuthTag: Uint8Array | string,
        cryptAlgorithm: Header.CryptAlgorithm,
        keySalt: Uint8Array | string,
        keyLength: number,
        argon2KeyOptions?: Argon2Options.AsObject,
        compressAlgorithm: Header.CompressAlgorithm,
    }

    export enum CryptAlgorithm {
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
