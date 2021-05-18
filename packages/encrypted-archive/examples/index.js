const fs = require('fs');
const path = require('path');
const stream = require('stream');
const util = require('util');

const { encrypt, decrypt, encryptStream, decryptStream } = require('@sounisi5011/encrypted-archive');

const fsPromises = fs.promises;
const streamPipelineAsync = util.promisify(stream.pipeline);

const password = '123456';

(async () => {
  {
    const cleartext = 'Hello World!';

    const encryptedData = await encrypt(cleartext, password, {
      // These options are optional, but it is recommended that you specify the appropriate options for your application.
      algorithm: 'chacha20-poly1305',
      keyDerivation: {
        algorithm: 'argon2d',
        iterations: 3,
        memory: 12,
        parallelism: 1,
      },
      // If the data to be encrypted is text, you can also compress the data
      // Binary data (e.g. images, videos, etc.) can also be compressed,
      // but the effect of compression is often small and is not recommended.
      compress: 'gzip',
    });
    console.log('Encrypted Data:', encryptedData);

    const decryptedData = await decrypt(encryptedData, password);
    console.log('Decrypted String:', decryptedData.toString('utf8'));
  }

  {
    const cleartextFilepath = path.resolve(__dirname, 'cleartext.txt');
    const encryptedDataFilepath = `${cleartextFilepath}.enc`;
    const decryptedDataFilepath = `${encryptedDataFilepath}.dec.txt`;

    await streamPipelineAsync(
      fs.createReadStream(cleartextFilepath, {
        // If you want to convert every chunk of a specific length,
        // specify the "highWaterMark" option when creating the ReadableStream.
        // see https://nodejs.org/docs/latest-v12.x/api/stream.html#stream_buffering
        highWaterMark: 10,
      }),
      encryptStream(password, {
        // These options are optional, but it is recommended that you specify the appropriate options for your application.
        algorithm: 'chacha20-poly1305',
        keyDerivation: {
          algorithm: 'argon2d',
          iterations: 3,
          memory: 12,
          parallelism: 1,
        },
        // If the file to be encrypted is a text file, you can also compress the data.
        // Binary file (e.g. images, videos, etc.) can also be compressed,
        // but the effect of compression is often small and is not recommended.
        compress: 'gzip',
      }),
      fs.createWriteStream(encryptedDataFilepath),
    );
    console.log('Encrypted File Data:', await fsPromises.readFile(encryptedDataFilepath));

    await streamPipelineAsync(
      fs.createReadStream(encryptedDataFilepath),
      decryptStream(password),
      fs.createWriteStream(decryptedDataFilepath),
    );
    console.log('Decrypted File String:', await fsPromises.readFile(decryptedDataFilepath, 'utf8'));
  }
})().catch(error => {
  process.exitCode = 1;
  process.stderr.write(util.inspect(error) + '\n');
});
