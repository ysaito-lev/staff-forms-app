import { auth } from "@/auth";
import { sheetsConfigured } from "@/lib/env";
import { hasMvbeSubmissionThisCalendarMonthJst } from "@/lib/my-responses-data";
import { getActiveStaff } from "@/lib/master";
import { MvbeForm } from "./mvbe-form";

export const dynamic = "force-dynamic";

export default async function MvbePage() {
  const session = await auth();
  const staff = await getActiveStaff();
  if (!session?.user.staffId) {
    return null;
  }
  const alreadySubmittedThisMonth =
    sheetsConfigured() &&
    (await hasMvbeSubmissionThisCalendarMonthJst(session.user.staffId));
  return (
    <MvbeForm
      initialStaff={staff}
      lockedRespondentId={session.user.staffId}
      alreadySubmittedThisMonth={alreadySubmittedThisMonth}
    />
  );
}
