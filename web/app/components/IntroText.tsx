import type { ReactNode } from "react";

function formatLine(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

type Props = { text: string; className?: string };

export function IntroText({ text, className }: Props) {
  const lines = text.split("\n");
  return (
    <div className={`space-y-2 text-[15px] leading-relaxed text-zinc-700 ${className ?? ""}`}>
      {lines.map((line, idx) => (
        <p key={idx}>{formatLine(line)}</p>
      ))}
    </div>
  );
}
