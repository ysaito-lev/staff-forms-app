import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getOrBuildStrengthsSnapshot } from "@/lib/build-strengths-snapshot";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";

export async function GET() {
  const session = await auth();
  if (!session?.user?.staffId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  const staffId = session.user.staffId.trim();
  const staff = await getActiveStaff();
  const me = getStaffByIdMap(staff).get(staffId);
  const displayName =
    (me?.name ?? "").trim() ||
    (session.user.name ?? "").trim() ||
    staffId;

  try {
    const snapshot = await getOrBuildStrengthsSnapshot({
      staffId,
      displayName,
    });
    return NextResponse.json(snapshot);
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "生成に失敗しました。";
    if (msg.includes("GEMINI_API_KEY")) {
      return NextResponse.json(
        { error: "AI 分析が未設定です（GEMINI_API_KEY）。" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "分析の取得に失敗しました。" }, { status: 500 });
  }
}
