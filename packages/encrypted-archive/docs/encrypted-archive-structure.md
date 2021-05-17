# Structure of the encrypted archive

[unsigned varint]: https://github.com/multiformats/unsigned-varint
[multicodec spec]: https://github.com/multiformats/multicodec
[Protocol Buffers]: https://developers.google.com/protocol-buffers/
[`src/header/protocol-buffers/header.proto`]: ../src/header/protocol-buffers/header.proto

Encrypted archive data consists of one "first chunk", followed by zero or more "subsequent chunks".
By being divided into multiple chunks, encryption and decryption can be performed without having to expand all the huge data into memory.

## First chunk

The "first chunk" is at the beginning of the data. This chunk contains the following 5 fields.

![](./first-chunk.svg)

1. Content Identifier

    The identifier of the data, compliant with the [multicodec spec].
    Codes within the [private use area range](https://github.com/multiformats/multicodec#private-use-area) are used.
    Currently, the following codes are in use:

    * `0x305011`

2. Header Length

    The data length of the Header encoded in [unsigned varint].
    It has a length of 1 to 9 bytes.

3. Header

    Binary data encoded by [Protocol Buffers] that contains the data required for decryption.
    The definition is the `Header` message in [`src/header/protocol-buffers/header.proto`] file.

4. Ciphertext Length

    The data length of the Ciphertext encoded in [unsigned varint].
    It has a length of 1 to 9 bytes.

5. Ciphertext

    Encrypted data.

## Subsequent chunk

The "subsequent chunk" exists after the "first chunk". This chunk contains the following 4 fields.

![](./subsequent-chunk.svg)

1. SimpleHeader Length

    The data length of the SimpleHeader encoded in [unsigned varint].
    It has a length of 1 to 9 bytes.

2. SimpleHeader

    Binary data encoded by [Protocol Buffers] that contains the data required for decryption.
    The definition is the `SimpleHeader` message in [`src/header/protocol-buffers/header.proto`] file.
    It does not contain any data that overlaps with the Header. This makes the data length shorter.

3. Ciphertext Length

    The data length of the Ciphertext encoded in [unsigned varint].
    It has a length of 1 to 9 bytes.

4. Ciphertext

    Encrypted data.
