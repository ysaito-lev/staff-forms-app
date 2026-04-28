import { StaffIdMissingNotice } from "@/app/components/StaffIdMissingNotice";
import { auth } from "@/auth";
import { sheetsConfigured } from "@/lib/env";
import { hasMvbeSubmissionInCurrentWindowJst } from "@/lib/my-responses-data";
import { getActiveStaff } from "@/lib/master";
import { MvbeForm } from "./mvbe-form";

export const dynamic = "force-dynamic";

export default async function MvbePage() {
  const session = await auth();
  const staff = await getActiveStaff();
  if (!session?.user.staffId) {
    return <StaffIdMissingNotice />;
  }
  const alreadySubmittedThisMonth =
    sheetsConfigured() &&
    (await hasMvbeSubmissionInCurrentWindowJst(session.user.staffId));
  return (
    <MvbeForm
      initialStaff={staff}
      lockedRespondentId={session.user.staffId}
      alreadySubmittedThisMonth={alreadySubmittedThisMonth}
    />
  );
}
