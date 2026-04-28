import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Amplify WEB_COMPUTE: `.next/standalone` が無いと deploy-manifest 生成に失敗する
  output: "standalone",
  images: {
    /** `NEXT_PUBLIC_LEVELA_LOGO_URL` が別ホストのときはここに hostname を追加 */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "levela.co.jp",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
