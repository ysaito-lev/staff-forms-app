import { auth } from "@/auth";
import { getActiveStaff } from "@/lib/master";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";
import { userStaffLinkTableConfigured } from "@/lib/env";
import { registerStaffLink } from "@/lib/user-staff-link";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  displayName: z.string().min(1).max(200),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.googleSub?.trim()) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.googleSub.trim().startsWith("cred:")) {
    return NextResponse.json(
      { error: "credential_use_register_endpoint" },
      { status: 400 }
    );
  }
  if (!userStaffLinkTableConfigured()) {
    return NextResponse.json(
      { error: "dynamo_not_configured" },
      { status: 503 }
    );
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const staff = await getActiveStaff();
  const match = findStaffByFlexibleNameMatch(staff, parsed.displayName);
  if (!match) {
    return NextResponse.json({ error: "no_staff_match" }, { status: 400 });
  }

  const result = await registerStaffLink({
    googleSub: session.user.googleSub.trim(),
    email: session.user.email,
    staffId: match.id,
  });

  if (!result.ok) {
    if (result.code === "staff_already_linked") {
      return NextResponse.json(
        { error: "staff_already_linked" },
        { status: 409 }
      );
    }
    if (result.code === "user_already_linked_staff") {
      return NextResponse.json(
        { error: "user_already_linked_staff" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: result.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true, staffId: match.id });
}
