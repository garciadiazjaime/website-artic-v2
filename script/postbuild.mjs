import { readFileSync, writeFileSync, readdirSync, copyFileSync } from "fs";
import { join } from "path";

const dir = ".netlify/edge-functions/entry.netlify-edge";
const entry = join(dir, "entry.netlify-edge.js");

// Rewrite all @-prefixed imports
let content = readFileSync(entry, "utf8");
content = content.replaceAll('"./@', '"./');
writeFileSync(entry, content);

// Copy all @-prefixed files to non-@ versions
readdirSync(dir)
  .filter((f) => f.startsWith("@"))
  .forEach((f) => copyFileSync(join(dir, f), join(dir, f.slice(1))));

console.log("postbuild: patched @ imports successfully");
