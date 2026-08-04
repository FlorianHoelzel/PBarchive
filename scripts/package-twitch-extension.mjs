import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceDirectory = path.join(projectRoot, "twitch-extension", "dist");
const outputDirectory = path.join(projectRoot, "outputs");
const outputFile = path.join(outputDirectory, "sumofbest-twitch-extension-1.0.0.zip");

async function collectFiles(directory, relative = "") {
  const files = {};
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryRelative = path.posix.join(relative, entry.name);
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(files, await collectFiles(entryPath, entryRelative));
    } else {
      files[entryRelative] = new Uint8Array(await readFile(entryPath));
    }
  }
  return files;
}

const files = await collectFiles(sourceDirectory);
for (const required of ["panel.html", "config.html"]) {
  if (!files[required]) throw new Error(`Missing required Twitch asset: ${required}`);
}

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputFile, zipSync(files, { level: 9 }));
console.log(`Created ${path.relative(projectRoot, outputFile)} with ${Object.keys(files).length} files.`);
