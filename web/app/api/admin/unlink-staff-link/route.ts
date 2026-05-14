import { auth } from "@/auth";
import { adminUnlinkStaff } from "@/lib/user-staff-link";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  staffId: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await adminUnlinkStaff(parsed.staffId);
  } catch (e) {
    console.error("[admin unlink-staff-link]", e);
    return NextResponse.json({ error: "unlink_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
