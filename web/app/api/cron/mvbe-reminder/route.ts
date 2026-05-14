import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { runMvbeReminderJob } from "@/lib/mvbe-reminder";

export async function POST(req: Request) {
  const secret = getEnv().MVBE_REMINDER_CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: "MVBE_REMINDER_CRON_SECRET が未設定です。" },
      { status: 503 }
    );
  }
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let threadId: string | undefined;
  try {
    const ct = req.headers.get("content-type");
    if (ct?.includes("application/json")) {
      const j: unknown = await req.json();
      if (j && typeof j === "object" && "threadId" in j) {
        const t = (j as { threadId?: unknown }).threadId;
        if (typeof t === "string") {
          const s = t.trim();
          if (s) threadId = s;
        }
      }
    }
  } catch {
    /* ボディなし可 */
  }
  const result = await runMvbeReminderJob(
    threadId !== undefined ? { threadId } : undefined
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, messagesSent: result.messagesSent });
}
