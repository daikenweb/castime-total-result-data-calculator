import pluginTypescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
//import { terser } from "rollup-plugin-terser";
import * as pkg from "./package.json";

const banner = `/*!
 * ${pkg.name} v${pkg.version}
 * ${pkg.homepage}
 * Copyright (c) ${new Date().getFullYear()} ${pkg.author.name}
 * Licensed under the ${pkg.license} license.
 */`;

export default [
  {
    input: "src/index.ts",
    output: {
      name: "index.js",
      file: pkg.module,
      format: "es",
      sourcemap: "inline",
      banner,
    },
    plugins: [
      pluginTypescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
  },
  {
    input: "src/index.ts",
    output: {
      name: "castime-total-result-data-calculator",
      file: pkg.browser,
      format: "es",
      sourcemap: "inline",
      banner,
    },
    plugins: [
      pluginTypescript({
        tsconfig: "./tsconfig.json",
      }),
      nodeResolve({
        browser: true,
      }),
      //terser(),
    ],
  },
];
