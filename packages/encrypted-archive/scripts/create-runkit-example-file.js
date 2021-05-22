const fs = require('fs');
const path = require('path');

const getPath = pathname => path.resolve(__dirname, pathname);

const exampleFilepath = getPath('../examples/index.js');
const runkitFilepath = getPath('../runkit-example.js');

const exampleFileText = fs.readFileSync(exampleFilepath, 'utf8');

const updatedExampleText = exampleFileText
  .replace(
    /^(?:[^\n]*\n+)*\(\s*async\s*\(\s*\)\s*=>\s*\{\n(([ \t]+)[^\n]*(?:\n+\2[^\n]*)*\n?)[\s\S]*$/,
    (_, mainCode, firstIndent) => {
      return mainCode.split('\n')
        .map(line => line.startsWith(firstIndent) ? line.substring(firstIndent.length) : line)
        .join('\n');
    },
  );

fs.writeFileSync(runkitFilepath, updatedExampleText);
console.log(`Create ${path.relative(process.cwd(), runkitFilepath)}`);
