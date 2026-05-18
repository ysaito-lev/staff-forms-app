import { StaffIdMissingNotice } from "@/app/components/StaffIdMissingNotice";
import { auth } from "@/auth";
import { getActiveStaff } from "@/lib/master";
import { ReadingHabitForm } from "./reading-habit-form";

export const dynamic = "force-dynamic";

export default async function ReadingHabitPage() {
  const session = await auth();
  const staff = await getActiveStaff();
  if (!session?.user.staffId) {
    return <StaffIdMissingNotice />;
  }
  return (
    <ReadingHabitForm
      initialStaff={staff}
      lockedRespondentId={session.user.staffId}
    />
  );
}
