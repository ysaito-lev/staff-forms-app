/**
 * amplify.yml があると Amplify ホスト側の自動 Next SSR パックが走らない環境がある。
 * `npm run build` 後、`output: standalone` の成果物から .amplify-hosting を構築する（Linux ビルド専用）。
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

/** @param {string} cmd */
function sh(cmd) {
  execSync(cmd, { stdio: "inherit", env: process.env });
}

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const nextVer = String(pkg.dependencies.next).replace(/^[\^~]/, "");

sh("mkdir -p .amplify-hosting/compute/default .amplify-hosting/static/_next/static");
sh("cp -r .next/standalone/. .amplify-hosting/compute/default/");
sh("mkdir -p .amplify-hosting/compute/default/.next/static");
sh("cp -r .next/static/. .amplify-hosting/compute/default/.next/static/");
sh("bash -lc '[ -d public ] && cp -r public/. .amplify-hosting/compute/default/public/ || true'");
sh("cp -r .next/static/. .amplify-hosting/static/_next/static/");
sh("bash -lc '[ -d public ] && cp -r public/. .amplify-hosting/static/ || true'");

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

writeFileSync(
  ".amplify-hosting/deploy-manifest.json",
  JSON.stringify(manifest, null, 2),
  "utf8"
);

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

writeFileSync(".amplify-hosting/compute/default/entrypoint.js", entry, "utf8");
