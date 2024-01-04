import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";
import fs from "fs/promises";

const packageJson = JSON.parse(await fs.readFile("./package.json", "utf-8"));

/**
 * @type {import("rollup").RollupOptions}
 */
export default [{
    input: "src/index.ts",
    output: {
        file: packageJson.module,
        format: "esm",
        sourcemap: true
    },
    plugins: [
        resolve(),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
    ],
    external: ["react", "react/jsx-runtime"]
}, {
    // input: "dist/dts/index.d.ts",
    input: "src/index.ts",
    output: {
        file: "dist/index.d.ts",
        format: "es"
    },
    plugins: [
        dts()
    ]
}];