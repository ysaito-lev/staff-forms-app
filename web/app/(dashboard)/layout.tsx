import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "@/app/components/DashboardShell";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        isAdmin: session.user.isAdmin,
      }}
    >
      {children}
    </DashboardShell>
  );
}
