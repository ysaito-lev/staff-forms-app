type DeptReceivedAgg = {
  department: string;
  entries: number;
  points: number;
};

type StaffReceivedByDeptMonthRow = {
  staffId: string;
  displayName: string;
  department: string;
  usesPoints: boolean;
  byDept: DeptReceivedAgg[];
};

/** 暦月・フォームごとの「部署別に届いた件数／ポイント」 */
export type ReceivedByDeptMonthBundle = {
  year: number;
  month: number;
  usesPoints: boolean;
  staff: StaffReceivedByDeptMonthRow[];
};
