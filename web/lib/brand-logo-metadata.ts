import fs from "node:fs";
import path from "node:path";
import {
  LEVELA_LOGO_REMOTE_URL,
  LOCAL_LEVELA_LOGO_FILE,
  LOCAL_LEVELA_LOGO_SRC,
} from "@/lib/brand-logo";

/** ファビコン等: `public/levela-logo.png` があればローカル、なければリモート URL */
export function resolveLevelaMetadataIcon(): string {
  try {
    const abs = path.join(process.cwd(), "public", LOCAL_LEVELA_LOGO_FILE);
    if (fs.existsSync(abs)) return LOCAL_LEVELA_LOGO_SRC;
  } catch {
    /* ignore */
  }
  return LEVELA_LOGO_REMOTE_URL;
}
