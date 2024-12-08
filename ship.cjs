const fs = require('fs/promises');
const path = require('path');

async function bootstrap() {
  const data = await fs.readFile(
    path.resolve(__dirname, './package.json'),
    'utf8',
  );
  const packageJson = JSON.parse(data);

  delete packageJson.scripts;
  delete packageJson.devDependencies;
  packageJson.main = 'index.js';
  packageJson.types = 'index.d.ts';

  fs.writeFile(
    path.resolve(__dirname, './build/package.json'),
    JSON.stringify(packageJson, null, '  '),
  );
}

bootstrap();
