import { build, context } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const validTargets = new Set(["main", "preload"]);
const args = process.argv.slice(2);
const target = args[0];

if (!validTargets.has(target)) {
  console.error(
    `Invalid target "${target}". Expected one of: ${Array.from(validTargets).join(", ")}.`,
  );
  process.exit(1);
}

const isWatch = args.includes("--watch");
const modeArg = args.find((arg) => arg.startsWith("--mode="));
const mode = modeArg ? modeArg.split("=")[1] : isWatch ? "development" : "production";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(dirname, "..");
const outFile = path.join(projectRoot, "dist", target, "index.js");
const entry = path.join(projectRoot, "src", target, "index.ts");

const define = {
  "process.env.NODE_ENV": JSON.stringify(mode),
};

const sharedConfig = {
  bundle: true,
  entryPoints: [entry],
  external: ["electron"],
  format: "cjs",
  logLevel: "info",
  minify: mode === "production",
  outfile: outFile,
  platform: "node",
  sourcemap: isWatch ? "inline" : false,
  target: "node18",
  define,
};

async function ensureOutDir() {
  await fs.mkdir(path.dirname(outFile), { recursive: true });
  if (!isWatch) {
    await fs.rm(outFile, { force: true });
  }
}

async function run() {
  await ensureOutDir();

  if (isWatch) {
    const ctx = await context(sharedConfig);
    await ctx.watch();
    console.log(`Watching ${target} for changes...`);
    await new Promise(() => {});
  } else {
    await build(sharedConfig);
    console.log(`Built ${target} script (${mode}).`);
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
