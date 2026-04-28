/**
 * amplify.yml を使うとホスト側の自動 Next SSR パックが走らない環境がある。
 * `npm run build` 後、`output: standalone` から `.amplify-hosting` を appRoot（web）直下に構築する。
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const staging = join(webRoot, ".amplify-hosting");

process.chdir(webRoot);

function q(p) {
  return `'${String(p).replace(/'/g, "'\\''")}'`;
}

function sh(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env, shell: "/bin/bash" });
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const nextVer = String(pkg.dependencies.next).replace(/^[\^~]/, "");

mkdirSync(join(staging, "compute", "default"), { recursive: true });
mkdirSync(join(staging, "static", "_next", "static"), { recursive: true });

sh(`cp -r .next/standalone/. ${q(join(staging, "compute", "default"))}/`);
mkdirSync(join(staging, "compute", "default", ".next", "static"), {
  recursive: true,
});
sh(`cp -r .next/static/. ${q(join(staging, "compute", "default", ".next", "static"))}/`);
if (existsSync("public")) {
  mkdirSync(join(staging, "compute", "default", "public"), { recursive: true });
  sh(`cp -r public/. ${q(join(staging, "compute", "default", "public"))}/`);
}
sh(`cp -r .next/static/. ${q(join(staging, "static", "_next", "static"))}/`);
if (existsSync("public")) {
  sh(`cp -r public/. ${q(join(staging, "static"))}/`);
}

const manifest = {
  version: 1,
  routes: [
    {
      path: "/_next/static/*",
      target: {
        kind: "Static",
        cacheControl: "public, max-age=31536000, immutable",
      },
    },
    {
      path: "/*.*",
      target: { kind: "Static" },
      fallback: { kind: "Compute", src: "default" },
    },
    { path: "/*", target: { kind: "Compute", src: "default" } },
  ],
  computeResources: [
    { name: "default", runtime: "nodejs20.x", entrypoint: "entrypoint.js" },
  ],
  framework: { name: "next", version: nextVer },
};

const manifestPath = join(staging, "deploy-manifest.json");
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

const entry = `process.on('uncaughtException', (e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
process.on('unhandledRejection', (e) => {
  console.error('REJECTION:', e);
});
console.log('Starting server...');
console.log(
  'ENV keys:',
  Object.keys(process.env)
    .filter((k) => !k.startsWith('_'))
    .sort()
    .join(',')
);
require('./server.js');
`;

writeFileSync(
  join(staging, "compute", "default", "entrypoint.js"),
  entry,
  "utf8"
);

console.error("[pack-amplify-ssr] wrote manifest:", manifestPath);
