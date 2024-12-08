import terser from '@rollup/plugin-terser';
import commonJS from '@rollup/plugin-commonjs';
import { globSync } from 'glob';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: Object.fromEntries(
    globSync(path.resolve(process.cwd(), 'build/**/*.js')).map((file) => [
      path.relative(
        'build',
        file.slice(0, file.length - path.extname(file).length),
      ),
      fileURLToPath(new URL(file, import.meta.url)),
    ]),
  ),
  makeAbsoluteExternalsRelative: true,
  treeshake: true,
  context: 'this',
  output: [
    {
      dir: './build/',
      format: 'cjs',
      preserveModules: true,
      entryFileNames: '[name].cjs',
      exports: 'auto',
    },
  ],
  plugins: [
    commonJS(),
    terser({
      format: {
        comments: false,
        beautify: false,
        ecma: '2020',
      },
      compress: true,
      mangle: false,
      module: true,
    }),
  ],
});
