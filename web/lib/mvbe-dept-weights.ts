import { getEnv } from "@/lib/env";
import type { Staff } from "@/lib/staff-types";
import { mainDepartment } from "@/lib/staff-types";

/** JST 暦月がこの年月以降なら MVBe ランキングをポイント集計に切り替える */
const MVBE_POINT_RANKING_START = { year: 2026, month: 5 } as const;

export function isMvbePointRankingMonth(year: number, month: number): boolean {
  const s = MVBE_POINT_RANKING_START;
  return year > s.year || (year === s.year && month >= s.month);
}

/**
 * ポイント傾斜:
 * - `N_ref = max_d(n_d)`（メイン部署ごとの在籍人数の最大）。
 * - **最大人数の部署**（`n_d === N_ref` かつ `N_ref > 0`）: **1.0 pt**。
 * - **それ以外**: 「非最大」の部署に現れる **在籍人数の種類** を昇順に並べた **階層リスト `tiers`** を作り、
 *   いちばん人数が少ない階層から順に **[上限 hi, … , 1.5]** と **等間隔**で割り当てる（人数分布が偏っていても段が均等）。
 *   同一人数の部署は同じ pt。`hi = max(1.5, MVBE_DEPT_WEIGHT_MAX)`（既定 3）。
 * - `n_d ≤ 0` またはマップに無い人数: **最小階層（hi）** と同じ扱い。
 * - 非最大の階層が 1 種類だけのとき: **(1.5 + hi) / 2**。
 * - `N_ref === 0`: **1.0**。
 * - **小数第1位**まで **四捨五入**した値を係数・シートの付与ポイントとする。
 */

/** 付与ポイント・係数を小数第1位で四捨五入（`Math.round(x*10)/10`） */
function roundMvbePointsHalfUp1dec(x: number): number {
  return Math.round(x * 10) / 10;
}

/** 最大部署以外の係数・付与ポイントの下限 */
const MVBE_WEIGHT_MIN_NONMAX = 1.5;

/** `MVBE_DEPT_WEIGHT_MAX` が空・不正なときの上限フォールバック */
const MVBE_WEIGHT_CAP_FALLBACK = 3;

/** メイン部署 → 在籍人数（getActiveStaff の配列から） */
function offlineDeptCounts(staff: Staff[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of staff) {
    const d = mainDepartment(s.department);
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

/** クリップ上限。空・不正時はフォールバック 3。 */
function mvbeDeptWeightCap(): number {
  const raw = getEnv().MVBE_DEPT_WEIGHT_MAX?.trim();
  if (!raw) return MVBE_WEIGHT_CAP_FALLBACK;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return MVBE_WEIGHT_CAP_FALLBACK;
  return n;
}

function globalNRef(counts: Map<string, number>): number {
  let nRef = 0;
  for (const v of counts.values()) {
    if (v > nRef) nRef = v;
  }
  return nRef;
}

/**
 * 非最大部署に現れる在籍人数のユニーク値（昇順）。
 * 最大人数ちょうどの部署は係数 1.0 のため含めない。
 */
function uniqueNonMaxHeadcounts(
  counts: Map<string, number>,
  nRef: number
): number[] {
  const set = new Set<number>();
  for (const n of counts.values()) {
    if (n > 0 && n < nRef) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

/**
 * `nRef > 0` 前提。最大部署なら 1.0、それ以外は tiers の順位で [minNonmax, hi] に等間隔。
 * 戻り値は小数第1位で四捨五入済み。
 */
function applyMvbeDeptWeight(
  nd: number,
  nRef: number,
  tiers: number[],
  cap: number
): number {
  let w: number;
  if (nd === nRef) {
    w = 1;
  } else {
    const hi = Math.max(MVBE_WEIGHT_MIN_NONMAX, cap);

    if (tiers.length === 0) {
      w = hi;
    } else {
      let tierIdx: number;
      if (nd <= 0) {
        tierIdx = 0;
      } else {
        const found = tiers.indexOf(nd);
        tierIdx = found >= 0 ? found : 0;
      }

      const m = tiers.length;
      if (m === 1) {
        w = (MVBE_WEIGHT_MIN_NONMAX + hi) / 2;
      } else {
        const t = tierIdx / (m - 1);
        w = hi - (hi - MVBE_WEIGHT_MIN_NONMAX) * t;
      }
    }
  }
  return roundMvbePointsHalfUp1dec(w);
}

export type MvbeDeptWeightResult = {
  voterDeptMain: string;
  deptCountNd: number;
  nRef: number;
  /** 適用後の係数（付与ポイントと同一） */
  weightApplied: number;
  /** 1票あたり付与ポイント（= weightApplied） */
  pointsGranted: number;
};

export function computeMvbeVoteWeightForDept(
  staff: Staff[],
  respondentDepartment: string
): MvbeDeptWeightResult {
  const counts = offlineDeptCounts(staff);
  const voterDeptMain = mainDepartment(respondentDepartment);
  const nd = counts.get(voterDeptMain) ?? 0;
  const nRef = globalNRef(counts);
  const cap = mvbeDeptWeightCap();
  const tiers = uniqueNonMaxHeadcounts(counts, nRef);

  let weightApplied: number;
  if (nRef <= 0) {
    weightApplied = roundMvbePointsHalfUp1dec(1);
  } else {
    weightApplied = applyMvbeDeptWeight(nd, nRef, tiers, cap);
  }

  return {
    voterDeptMain,
    deptCountNd: nd,
    nRef,
    weightApplied,
    pointsGranted: weightApplied,
  };
}

/** 管理者向け：部署別の係数一覧 */
export function listMvbeDeptWeights(staff: Staff[]): MvbeDeptWeightResult[] {
  const counts = offlineDeptCounts(staff);
  const nRef = globalNRef(counts);
  const cap = mvbeDeptWeightCap();
  const tiers = uniqueNonMaxHeadcounts(counts, nRef);

  const rows: MvbeDeptWeightResult[] = [];
  for (const [dept, nd] of [...counts.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "ja")
  )) {
    const weightApplied =
      nRef <= 0
        ? roundMvbePointsHalfUp1dec(1)
        : applyMvbeDeptWeight(nd, nRef, tiers, cap);
    rows.push({
      voterDeptMain: dept,
      deptCountNd: nd,
      nRef,
      weightApplied,
      pointsGranted: weightApplied,
    });
  }
  return rows;
}
