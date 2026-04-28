import { DEPARTMENT_ORDER } from "@/lib/departments";

/** メイン部署（マスタ上の D 列に相当。表示用の `Staff.department` は `メイン（サブ）` の場合あり） */
export function mainDepartment(department: string): string {
  const d = department.trim() || "未分類";
  if (d === "未分類") return "未分類";
  if (d.includes("（") && d.endsWith("）")) {
    return d.split("（")[0]!.trim() || d;
  }
  return d;
}

export type Staff = {
  /** ログインの staffId（マスタの氏名と一致させる想定） */
  id: string;
  name: string;
  /** 任意列「メール」「ワークスペースメール」等。Google と突合するとき氏名のみだと別字で一致しないことがあるため。 */
  matchEmail?: string | null;
  /** 表示・グルーピング用（メイン部署＋サブ部署） */
  department: string;
  furigana: string;
  nickname: string | null;
  isExecutive: boolean;
};

export function groupByDepartment(staff: Staff[]): Map<string, Staff[]> {
  const map = new Map<string, Staff[]>();
  for (const s of staff) {
    const dep = mainDepartment(s.department);
    const list = map.get(dep) ?? [];
    list.push(s);
    map.set(dep, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  }
  return map;
}

/** 部署の並びは上記 16 部署のみ（この順）。一覧にないメイン名は出現しません。 */
export function sortedDepartments(map: Map<string, Staff[]>): string[] {
  const keys = new Set(map.keys());
  return DEPARTMENT_ORDER.filter((d) => keys.has(d));
}

export function filterStaffSearch(staff: Staff[], q: string): Staff[] {
  const n = q.trim().toLowerCase();
  if (!n) return staff;
  return staff.filter((s) => {
    const name = s.name.toLowerCase();
    const nick = (s.nickname ?? "").toLowerCase();
    const f = s.furigana.toLowerCase();
    return name.includes(n) || nick.includes(n) || f.includes(n);
  });
}
