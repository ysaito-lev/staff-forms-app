"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import {
  LEVELA_LOGO_HEIGHT,
  LEVELA_LOGO_REMOTE_URL,
  LEVELA_LOGO_WIDTH,
  LOCAL_LEVELA_LOGO_SRC,
} from "@/lib/brand-logo";

type Variant = "auth" | "sidebar" | "header";

const variantClass: Record<Variant, { wrap: string; image: string }> = {
  auth: {
    wrap: "flex justify-center",
    image: "h-[4.5rem] w-auto max-w-full object-contain md:h-[5rem]",
  },
  sidebar: {
    wrap: "flex justify-start",
    image: "h-9 w-auto max-w-[11.5rem] object-contain object-left",
  },
  header: {
    wrap: "flex items-center",
    image: "h-8 w-auto max-w-[9rem] object-contain object-left",
  },
};

type Props = {
  variant?: Variant;
  className?: string;
  priority?: boolean;
};

/**
 * ロゴ: まず `public/levela-logo.png`、読み込み失敗時はリモート URL
 */
export function BrandLogo({ variant = "auth", className = "", priority }: Props) {
  const v = variantClass[variant];
  const [src, setSrc] = useState(LOCAL_LEVELA_LOGO_SRC);

  const onError = useCallback(() => {
    setSrc((current) =>
      current === LOCAL_LEVELA_LOGO_SRC ? LEVELA_LOGO_REMOTE_URL : current
    );
  }, []);

  return (
    <div className={`${v.wrap} ${className}`.trim()}>
      <Image
        src={src}
        alt="株式会社 Levela"
        width={LEVELA_LOGO_WIDTH}
        height={LEVELA_LOGO_HEIGHT}
        className={v.image}
        priority={priority}
        unoptimized
        onError={onError}
      />
    </div>
  );
}
