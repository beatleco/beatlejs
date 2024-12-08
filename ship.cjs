const fs = require('fs/promises');
const path = require('path');

async function bootstrap() {
  const packageJsonContents = await fs.readFile(
    path.resolve(__dirname, './package.json'),
    'utf8',
  );
  const packageJsonParsed = JSON.parse(packageJsonContents);
  delete packageJsonParsed.scripts;
  delete packageJsonParsed.devDependencies;
  delete packageJsonParsed.peerDependencies;
  packageJsonParsed.main = 'index.js';
  packageJsonParsed.types = 'index.d.ts';

  fs.writeFile(
    path.resolve(__dirname, './build/package.json'),
    JSON.stringify(packageJsonParsed, null, '  '),
  );

  await fs.copyFile(
    path.resolve(__dirname, './README.md'),
    path.resolve(__dirname, './build/README.md'),
  );

  await fs.unlink(path.resolve(__dirname, './build/tsconfig.tsbuildinfo'))
}

bootstrap();
