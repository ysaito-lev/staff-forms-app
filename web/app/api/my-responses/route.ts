import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadMyResponses } from "@/lib/my-responses-data";

export async function GET() {
  const session = await auth();
  if (!session?.user?.staffId) {
    return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
  }

  try {
    const data = await loadMyResponses(session.user.staffId);
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "回答データの取得に失敗しました。" },
      { status: 500 }
    );
  }
}
