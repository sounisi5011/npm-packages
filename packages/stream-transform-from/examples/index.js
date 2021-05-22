const stream = require('stream');

const { transformFrom } = require('@sounisi5011/stream-transform-from');

stream.pipeline(
  stream.Readable.from([1, 2, 3, 4, 5]),
  // Convert a number to a Buffer object.
  transformFrom(
    async function*(source) {
      for await (const { chunk: inputChunk } of source) {
        console.log({ inputChunk });

        if (typeof inputChunk === 'number') {
          const code = inputChunk;
          yield Buffer.from([code]);
        }
      }
    },
    { writableObjectMode: true },
  ),
  // Transform a Buffer object.
  transformFrom(async function*(source) {
    for await (const { chunk } of source) {
      yield Buffer.concat([
        Buffer.from([0xF0]),
        chunk,
        Buffer.from([0xFF]),
      ]);
    }
  }),
  new stream.Writable({
    write(outputChunk, _, done) {
      console.log({ outputChunk });
      done();
    },
  }),
  error => {
    if (error) {
      console.error(error);
    } else {
      console.log('done!');
    }
  },
);
