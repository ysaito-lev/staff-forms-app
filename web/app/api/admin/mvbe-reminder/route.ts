import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadMvbeReminderPreview, runMvbeReminderJob } from "@/lib/mvbe-reminder";

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  const result = await loadMvbeReminderPreview();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, preview: result.preview });
}

async function parseThreadId(req: Request): Promise<string | undefined> {
  try {
    const ct = req.headers.get("content-type");
    if (!ct?.includes("application/json")) return undefined;
    const j: unknown = await req.json();
    if (j && typeof j === "object" && "threadId" in j) {
      const t = (j as { threadId?: unknown }).threadId;
      if (typeof t === "string") {
        const s = t.trim();
        return s || undefined;
      }
    }
  } catch {
    /* 空ボディ可 */
  }
  return undefined;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  const threadId = await parseThreadId(req);
  const result = await runMvbeReminderJob(
    threadId !== undefined ? { threadId } : undefined
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, messagesSent: result.messagesSent });
}
