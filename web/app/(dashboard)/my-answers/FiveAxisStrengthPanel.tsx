"use client";

import type { CSSProperties } from "react";
import { useMemo } from "react";
import {
  RADAR_AXIS_ENGLISH_LABEL,
  type FiveAxisRowPublic,
} from "@/lib/strengths-analysis-schema";
import { STRENGTHS_REPORT_UI as UI } from "@/lib/strengths-report-ui";

/** 添付デザイン寄り: 高得点は黄〜オレ、中はオレ寄りグラデ、低めはブルーグレー系 */
function barStyle(percent: number): CSSProperties {
  const p = Math.min(100, Math.max(0, percent));
  if (p >= 70) {
    return {
      width: `${p}%`,
      background: `linear-gradient(90deg, #FFCA28 0%, ${UI.secondary} 35%, ${UI.primary} 100%)`,
    };
  }
  if (p >= 45) {
    return {
      width: `${p}%`,
      background: `linear-gradient(90deg, #94a3b8 0%, ${UI.secondary} 40%, ${UI.primary} 100%)`,
    };
  }
  return {
    width: `${p}%`,
    background: `linear-gradient(90deg, #546e7a 0%, #78909c 45%, #b0bec5 100%)`,
  };
}

function FiveAxisRadar({ axes }: { axes: FiveAxisRowPublic[] }) {
  const cx = 200;
  const cy = 200;
  const R = 118;
  const labelRadius = R + 44;
  const n = Math.min(axes.length, 5);
  const levels = [0.2, 0.4, 0.6, 0.8, 1];

  const gridPolygons = levels.map((lv) => {
    const pts: string[] = [];
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
      const d = lv * R;
      pts.push(`${cx + d * Math.cos(ang)},${cy + d * Math.sin(ang)}`);
    }
    return pts.join(" ");
  });

  const vertexCoords: { x: number; y: number }[] = [];
  const dataPts: string[] = [];
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const p = Math.max(0, Math.min(100, axes[i]!.scorePercent));
    const d = (p / 100) * R;
    const x = cx + d * Math.cos(ang);
    const y = cy + d * Math.sin(ang);
    vertexCoords.push({ x, y });
    dataPts.push(`${x},${y}`);
  }
  const dataPolygon = dataPts.join(" ");

  return (
    <svg
      viewBox="0 0 400 400"
      className="mx-auto h-auto w-full max-w-[min(100%,400px)] min-h-[240px]"
      aria-label="5軸レーダー"
    >
      {gridPolygons.map((points, idx) => (
        <polygon
          key={idx}
          points={points}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: n }, (_, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const x2 = cx + R * Math.cos(ang);
        const y2 = cy + R * Math.sin(ang);
        return (
          <line
            key={`spoke-${i}`}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })}
      <polygon
        points={dataPolygon}
        fill={UI.primary}
        fillOpacity={0.22}
        stroke={UI.primary}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {vertexCoords.map((v, i) => (
        <circle key={`d-${axes[i]!.key}`} cx={v.x} cy={v.y} r={3} fill={UI.primary} />
      ))}
      {axes.slice(0, n).map((a, i) => {
        const ang = -Math.PI / 2 + (2 * Math.PI * i) / n;
        const lx = cx + labelRadius * Math.cos(ang);
        const ly = cy + labelRadius * Math.sin(ang);
        const radarLabel = RADAR_AXIS_ENGLISH_LABEL[a.key] ?? a.key;
        return (
          <text
            key={a.key}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-600 text-[11px] font-medium md:text-[13px]"
          >
            {radarLabel}
          </text>
        );
      })}
    </svg>
  );
}

const cardBase =
  "rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.06)] sm:p-5";

export function FiveAxisStrengthPanel({ axes }: { axes: FiveAxisRowPublic[] }) {
  const sortedForList = useMemo(
    () => [...axes].sort((a, b) => b.scorePercent - a.scorePercent),
    [axes]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 md:gap-5">
      <div className={cardBase}>
        <h3
          className="mb-4 text-center text-sm font-bold sm:text-base"
          style={{ color: UI.primary }}
        >
          5軸強み分析
        </h3>
        <FiveAxisRadar axes={axes} />
      </div>
      <div className={cardBase}>
        <h3
          className="mb-5 text-sm font-bold sm:text-base"
          style={{ color: UI.primary }}
        >
          各軸のスコア
        </h3>
        <ul className="space-y-5">
          {sortedForList.map((a) => (
            <li key={a.key}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium leading-snug text-slate-800">
                  {a.labelDisplay}
                </span>
                <span className="shrink-0 tabular-nums text-base font-bold text-slate-900">
                  {a.scorePercent}%
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-orange-100/70">
                <div className="h-full rounded-full transition-all" style={barStyle(a.scorePercent)} />
              </div>
              {a.blurb ? (
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{a.blurb}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
