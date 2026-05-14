import { hashPasswordCredential, credentialSubjectFromEmail } from "@/lib/credential-auth";
import { getActiveStaff } from "@/lib/master";
import { findStaffByFlexibleNameMatch } from "@/lib/staff-match";
import { userStaffLinkTableConfigured } from "@/lib/env";
import { registerStaffLink } from "@/lib/user-staff-link";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  displayName: z.string().min(1).max(200),
  email: z.string().email().max(254),
  password: z.string().min(6).max(200),
});

export async function POST(req: Request) {
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

  const emailNorm = parsed.email.trim().toLowerCase();
  const staff = await getActiveStaff();
  const match = findStaffByFlexibleNameMatch(staff, parsed.displayName);
  if (!match) {
    return NextResponse.json({ error: "no_staff_match" }, { status: 400 });
  }

  const { hashB64, saltB64 } = hashPasswordCredential(parsed.password);
  const googleSub = credentialSubjectFromEmail(emailNorm);

  const result = await registerStaffLink({
    googleSub,
    email: emailNorm,
    staffId: match.id,
    credentialAuth: {
      passwordHashB64: hashB64,
      saltB64: saltB64,
      displayName: parsed.displayName.trim(),
    },
  });

  if (!result.ok) {
    if (result.code === "staff_already_linked") {
      return NextResponse.json({ error: "staff_already_linked" }, { status: 409 });
    }
    if (result.code === "user_already_linked_staff") {
      return NextResponse.json(
        { error: "user_already_linked_staff" },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: result.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
