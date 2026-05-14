import { auth } from "@/auth";
import { geminiConfigured } from "@/lib/env";
import { getOrBuildStrengthsSnapshot } from "@/lib/build-strengths-snapshot";
import { getActiveStaff, getStaffByIdMap } from "@/lib/master";
import { redirect } from "next/navigation";
import { StrengthsReportClient } from "./StrengthsReportClient";

export const dynamic = "force-dynamic";

export default async function StrengthsReportPage() {
  const session = await auth();
  if (!session?.user?.staffId?.trim()) {
    redirect("/complete-profile");
  }

  const staffId = session.user.staffId.trim();
  const staff = await getActiveStaff();
  const me = getStaffByIdMap(staff).get(staffId);
  const displayName =
    (me?.name ?? "").trim() ||
    (session.user.name ?? "").trim() ||
    staffId;

  try {
    const snap = await getOrBuildStrengthsSnapshot({ staffId, displayName });
    return <StrengthsReportClient initialSnapshot={snap} initialError={null} />;
  } catch (e) {
    console.error("[strengths-report]", e);
    const msg = e instanceof Error ? e.message : "";
    const friendly =
      msg.includes("GEMINI_API_KEY") || !geminiConfigured()
        ? "AI 分析が未設定です（GEMINI_API_KEY）。環境変数を設定してください。"
        : "分析の取得に失敗しました。時間をおいて再度お試しください。";
    return (
      <StrengthsReportClient initialSnapshot={null} initialError={friendly} />
    );
  }
}
