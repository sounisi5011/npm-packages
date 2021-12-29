const util = require('util');

(async () => {
  const { encrypt, decrypt } = require('@sounisi5011/encrypted-archive');

  const cleartext = 'Hello World!';
  const password = '123456';

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
  console.log('Decrypted String:', new TextDecoder('utf-8', { fatal: true }).decode(decryptedData));
})().catch(error => {
  process.exitCode = 1;
  process.stderr.write(util.inspect(error) + '\n');
});
