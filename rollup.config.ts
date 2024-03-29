import pluginTypescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import pkg from './package.json' assert { type: 'json' };

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
 * Licensed under the ${pkg.license} license.
 */`;

export default [
  {
    input: 'src/index.ts',
    output: {
      name: 'index.js',
      file: pkg.module,
      format: 'es',
      sourcemap: 'inline',
      banner,
    },
    plugins: [
      pluginTypescript({
        tsconfig: './tsconfig.json',
      }),
    ],
    external: [...Object.keys(pkg.dependencies), 'date-fns/fp'],
  },
  {
    input: 'src/index.ts',
    output: {
      name: 'castime-total-result-data-calculator',
      file: pkg.browser,
      format: 'es',
      sourcemap: 'inline',
      banner,
    },
    plugins: [
      pluginTypescript({
        tsconfig: './tsconfig.json',
      }),
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      terser(),
    ],
  },
  {
    input: 'src/index.ts',
    output: {
      name: 'castime-total-result-data-calculator',
      file: pkg.main,
      format: 'cjs',
      sourcemap: 'inline',
      banner,
    },
    plugins: [
      pluginTypescript({
        tsconfig: './tsconfig.json',
      }),
      nodeResolve({
        browser: true,
      }),
      commonjs(),
      terser(),
    ],
  },
];
