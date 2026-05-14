/** クライアントでも安全に import できる（googleapis に依存しない）。`department` はメイン部署想定。 */

export function groupNonRespondersByDepartment<
  T extends { id: string; name: string; department: string },
>(people: T[]): { department: string; members: T[] }[] {
  const byDept = new Map<string, T[]>();
  for (const p of people) {
    const d = p.department.trim() || "（部署未設定）";
    if (!byDept.has(d)) byDept.set(d, []);
    byDept.get(d)!.push(p);
  }
  const depts = [...byDept.keys()].sort((a, b) => a.localeCompare(b, "ja"));
  return depts.map((department) => ({
    department,
    members: byDept.get(department)!.sort((a, b) =>
      a.name.localeCompare(b.name, "ja")
    ),
  }));
}
