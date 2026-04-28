import { auth } from "@/auth";
import { getActiveStaff } from "@/lib/master";
import { SoreineForm } from "./soreine-form";

export const dynamic = "force-dynamic";

export default async function SoreinePage() {
  const session = await auth();
  const staff = await getActiveStaff();
  if (!session?.user.staffId) {
    return null;
  }
  return (
    <SoreineForm initialStaff={staff} lockedRespondentId={session.user.staffId} />
  );
}
