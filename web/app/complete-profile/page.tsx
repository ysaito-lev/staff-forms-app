import { auth } from "@/auth";
import { getEnv } from "@/lib/env";
import { redirect } from "next/navigation";
import { CompleteProfileForm } from "./CompleteProfileForm";

export const dynamic = "force-dynamic";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/complete-profile");
  }
  const sid = session.user.staffId?.trim() ?? "";
  if (sid) {
    redirect("/");
  }
  const env = getEnv();
  if (!env.DYNAMODB_USER_STAFF_TABLE?.trim() && !env.AUTH_STAFF_LINK_FALLBACK_GOOGLE) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-semibold">職員紐づけが設定されていません</p>
          <p className="mt-2 leading-relaxed">
            管理者に <code className="rounded bg-amber-100/80 px-1">DYNAMODB_USER_STAFF_TABLE</code>{" "}
            の設定を依頼するか、移行中のみ{" "}
            <code className="rounded bg-amber-100/80 px-1">
              AUTH_STAFF_LINK_FALLBACK_GOOGLE
            </code>{" "}
            を有効にしてください。
          </p>
        </div>
      </div>
    );
  }
  if (!env.DYNAMODB_USER_STAFF_TABLE?.trim() && env.AUTH_STAFF_LINK_FALLBACK_GOOGLE) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 px-4">
        <div className="max-w-md rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
          <p className="font-semibold">職員を自動で特定できませんでした</p>
          <p className="mt-2 leading-relaxed">
            DynamoDB が未設定のときはこの氏名確認画面だけでは運用できません。必ず管理者に{" "}
            <code className="rounded bg-amber-100/80 px-1">DYNAMODB_USER_STAFF_TABLE</code>
            を設定していただいてください。
          </p>
        </div>
      </div>
    );
  }

  return <CompleteProfileForm />;
}
