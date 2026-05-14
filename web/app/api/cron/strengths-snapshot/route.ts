import { NextResponse } from "next/server";
import { refreshStrengthsSnapshotForStaff } from "@/lib/build-strengths-snapshot";
import { getEnv } from "@/lib/env";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";

/** ユーザー閲覧時の「同一暦月は AI 抑止」を無視して再生成する運用用エンドポイント（任意）。 */

export async function POST(req: Request) {
  const secret = getEnv().STRENGTHS_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "STRENGTHS_CRON_SECRET が未設定です。" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { staffIds?: string[] } = {};
  try {
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      body = (await req.json()) as typeof body;
    }
  } catch {
    /* ignore */
  }

  const staffList = await getActiveStaff();
  const map = getStaffByIdMap(staffList);
  const ids =
    Array.isArray(body.staffIds) && body.staffIds.length > 0
      ? body.staffIds.map((s) => String(s).trim()).filter(Boolean)
      : staffList.map((s) => s.id);

  let ok = 0;
  let failed = 0;
  for (const staffId of ids) {
    const me = map.get(staffId);
    const displayName = (me?.name ?? "").trim() || staffId;
    try {
      await refreshStrengthsSnapshotForStaff({
        staffId,
        displayName,
      });
      ok += 1;
    } catch (e) {
      console.error("[cron strengths-snapshot]", staffId, e);
      failed += 1;
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return NextResponse.json({ ok: true, scope: "all", processed: ok, failed });
}
