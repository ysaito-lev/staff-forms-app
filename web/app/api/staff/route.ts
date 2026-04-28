import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getActiveStaff } from "@/lib/master";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }
  try {
    const staff = await getActiveStaff();
    return NextResponse.json({ staff });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "スタッフ一覧の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
