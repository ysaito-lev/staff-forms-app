import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
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
