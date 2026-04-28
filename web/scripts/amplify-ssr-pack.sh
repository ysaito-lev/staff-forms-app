#!/usr/bin/env bash
# Amplify がリポジトリ内 amplify.yml を使うと、Next SSR 用の自動パッケージが走らない場合がある。
# output: standalone が揃ったあと、.amplify-hosting を組み立てる（ログの成功ジョブと同じ手順）。
set -euo pipefail

cd "$(dirname "$0")/.."

NEXT_VER=$(node -p "require('./package.json').dependencies.next.replace(/^[\^~]/,'')")

mkdir -p .amplify-hosting/compute/default .amplify-hosting/static/_next/static
cp -r .next/standalone/. .amplify-hosting/compute/default/
cp -r .next/static/. .amplify-hosting/compute/default/.next/static/
if [ -d public ]; then cp -r public/. .amplify-hosting/compute/default/public/; fi
cp -r .next/static/. .amplify-hosting/static/_next/static/
if [ -d public ]; then cp -r public/. .amplify-hosting/static/; fi

export NEXT_JS_VERSION="$NEXT_VER"
node -e '
const fs = require("fs");
const v = process.env.NEXT_JS_VERSION;
fs.writeFileSync(
  ".amplify-hosting/deploy-manifest.json",
  JSON.stringify(
    {
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
      framework: { name: "next", version: v },
    },
    null,
    2
  )
);
'

cat > .amplify-hosting/compute/default/entrypoint.js << 'ENTRY'
process.on('uncaughtException', (e) => {
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
ENTRY
