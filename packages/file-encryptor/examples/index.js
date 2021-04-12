const fs = require('fs');
const path = require('path');

const { Encryptor } = require('@sounisi5011/file-encryptor');

const fsPromises = fs.promises;

const password = '123456';
const encryptor = new Encryptor(password, {
  // These options are optional, but it is recommended that you specify the appropriate options for your application.
  algorithm: 'chacha20-poly1305',
  keyDerivation: {
    algorithm: 'argon2d',
    iterations: 3,
    memory: 12,
    parallelism: 1,
  },
});

(async () => {
  {
    const cleartext = 'Hello World!';

    const encryptedData = await encryptor.encrypt(cleartext, {
      // If the data to be encrypted is text, you can also compress the data
      // Binary data (e.g. images, videos, etc.) can also be compressed,
      // but the effect of compression is often small and is not recommended.
      compress: 'gzip',
    });
    console.log('Encrypted Data:', encryptedData);

    const decryptedData = await encryptor.decrypt(encryptedData);
    console.log('Decrypted String:', decryptedData.toString('utf8'));
  }

  {
    const cleartextFilepath = path.resolve(__dirname, 'cleartext.txt');
    const encryptedDataFilepath = `${cleartextFilepath}.enc`;
    const decryptedDataFilepath = `${encryptedDataFilepath}.dec.txt`;

    fs.createReadStream(cleartextFilepath)
      .pipe(encryptor.encryptStream({
        // If the file to be encrypted is a text file, you can also compress the data.
        // Binary file (e.g. images, videos, etc.) can also be compressed,
        // but the effect of compression is often small and is not recommended.
        compress: 'gzip',
      }))
      .pipe(fs.createWriteStream(encryptedDataFilepath));
    console.log('Encrypted File Data:', await fsPromises.readFile(encryptedDataFilepath));

    fs.createReadStream(encryptedDataFilepath)
      .pipe(encryptor.decryptStream())
      .pipe(fs.createWriteStream(decryptedDataFilepath));
    console.log('Decrypted File String:', await fsPromises.readFile(decryptedDataFilepath, 'utf8'));
  }
})();
