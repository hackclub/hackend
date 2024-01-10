import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import { dts } from "rollup-plugin-dts";
// import { wasm } from "@rollup/plugin-wasm";
import fs from "fs/promises";

const packageJson = JSON.parse(await fs.readFile("./package.json", "utf-8"));

function isBareModuleId(id) {
    return !id.startsWith(".") && !id.startsWith("/");
}

/**
 * @type {import("rollup").RollupOptions}
 */
export default [{
    input: "./src/index.ts",
    output: {
        file: packageJson.module,
        format: "esm",
        sourcemap: true
    },
    plugins: [
        // wasm(), // for automerge
        resolve({ browser: true }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
    ],
    external: isBareModuleId
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