import { getEnv } from "@/lib/env";

const GEMINI_TIMEOUT_MS = 90_000;

function extractJsonText(raw: string): string {
  const t = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t);
  if (fence?.[1]) return fence[1].trim();
  return t;
}

export async function geminiGenerateJson(userPrompt: string): Promise<string> {
  const key = getEnv().GEMINI_API_KEY?.trim();
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  const model = getEnv().GEMINI_MODEL?.trim() || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.35,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("[gemini] HTTP", res.status, text.slice(0, 400));
    throw new Error(`Gemini API error: ${res.status}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Gemini response is not JSON");
  }

  const root = parsed as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const t =
    root.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  if (!t.trim()) {
    console.error("[gemini] empty candidates", text.slice(0, 500));
    throw new Error("Gemini returned empty content");
  }
  return extractJsonText(t);
}
