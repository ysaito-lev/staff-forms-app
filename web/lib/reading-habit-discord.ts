import { getEnv } from "@/lib/env";
import { discordWebhookExecuteUrl } from "@/lib/mvbe-reminder";

function webhookUrl(): string | null {
  return getEnv().DISCORD_READING_HABIT_WEBHOOK_URL?.trim() || null;
}

export function isReadingHabitDiscordWebhookConfigured(): boolean {
  return Boolean(webhookUrl());
}

/** Code.gs `読書.gas` の `sendToDiscord` と同一体裁の本文を Webhook 送信 */
export async function notifyReadingHabitSubmissionToDiscord(params: {
  respondentName: string;
  bookTitle: string;
  comment: string;
  application: string;
  rating: number;
}): Promise<void> {
  const webhook = webhookUrl();
  if (!webhook) {
    throw new Error("DISCORD_READING_HABIT_WEBHOOK_URL が未設定です。");
  }

  const score = Math.min(5, Math.max(1, Math.floor(params.rating)));
  const stars = "★".repeat(score) + "☆".repeat(5 - score);

  const message =
    "📕——・——・——・——・——\n\n【お名前】\n" +
    params.respondentName.trim() +
    "\n\n【読んだ本】\n" +
    params.bookTitle.trim() +
    "\n\n【評価】\n" +
    stars +
    "\n\n【感想】\n" +
    params.comment.trim() +
    "\n\n【活かせそうなところ】\n" +
    params.application.trim() +
    "\n\n——・——・——・——・——📕";

  const url = discordWebhookExecuteUrl(
    webhook,
    getEnv().DISCORD_READING_HABIT_THREAD_ID
  );

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });

  if (!res.ok) {
    const t = (await res.text()).slice(0, 400);
    throw new Error(`Discord Webhook が失敗しました (${res.status}): ${t}`);
  }
}
