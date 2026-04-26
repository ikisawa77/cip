import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import nodeResolve from "@rollup/plugin-node-resolve";
import replace from "@rollup/plugin-replace";
import typescript from "@rollup/plugin-typescript";
import postcss from "rollup-plugin-postcss";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(rootDir, "../api/public");
const templatePath = path.resolve(rootDir, "index.html");

function cleanOutputDirectory() {
  return {
    name: "clean-output-directory",
    buildStart() {
      fs.rmSync(outputDir, { recursive: true, force: true });
      fs.mkdirSync(outputDir, { recursive: true });
    }
  };
}

function emitIndexHtml() {
  return {
    name: "emit-index-html",
    generateBundle(_options, bundle) {
      const template = fs.readFileSync(templatePath, "utf8");
      const entryChunk = Object.values(bundle).find(
        (asset) => asset.type === "chunk" && asset.isEntry
      );

      if (!entryChunk || entryChunk.type !== "chunk") {
        throw new Error("Cannot find the web entry chunk while generating index.html");
      }

      const cssAssets = Object.values(bundle)
        .filter((asset) => asset.type === "asset" && asset.fileName.endsWith(".css"))
        .map((asset) => `<link rel="stylesheet" href="/${asset.fileName}" />`)
        .join("\n    ");

      const scriptTag = `<script type="module" src="/${entryChunk.fileName}"></script>`;
      const htmlTags = [cssAssets, scriptTag].filter(Boolean).join("\n    ");

      const html = template.replace(
        /<script type="module" src="\/src\/main\.tsx"><\/script>/,
        htmlTags
      );

      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: html
      });
    }
  };
}

export default {
  input: path.resolve(rootDir, "src/main.tsx"),
  onwarn(warning, warn) {
    if (warning.code === "MODULE_LEVEL_DIRECTIVE") {
      return;
    }

    warn(warning);
  },
  output: {
    dir: outputDir,
    format: "esm",
    sourcemap: false,
    banner:
      'const process = globalThis.process && globalThis.process.env ? globalThis.process : { env: { NODE_ENV: "production" } };',
    entryFileNames: "assets/[name]-[hash].js",
    chunkFileNames: "assets/[name]-[hash].js",
    assetFileNames: "assets/[name]-[hash][extname]"
  },
  plugins: [
    cleanOutputDirectory(),
    alias({
      entries: [{ find: "@", replacement: path.resolve(rootDir, "src") }]
    }),
    replace({
      preventAssignment: true,
      values: {
        "import.meta.env.VITE_API_BASE": JSON.stringify(process.env.VITE_API_BASE ?? ""),
        "process.env.NODE_ENV": JSON.stringify("production"),
        "process.env?.NODE_ENV": JSON.stringify("production")
      }
    }),
    nodeResolve({
      extensions: [".mjs", ".js", ".json", ".jsx", ".ts", ".tsx"]
    }),
    commonjs(),
    postcss({
      extract: "assets/styles.css",
      minimize: false,
      plugins: [await import("@tailwindcss/postcss").then((module) => module.default())]
    }),
    typescript({
      include: [
        path.resolve(rootDir, "src/**/*.ts"),
        path.resolve(rootDir, "src/**/*.tsx"),
        path.resolve(rootDir, "../../packages/shared/src/**/*.ts"),
        path.resolve(rootDir, "../../packages/shared/src/**/*.tsx")
      ],
      tsconfig: path.resolve(rootDir, "tsconfig.json")
    }),
    emitIndexHtml()
  ]
};
