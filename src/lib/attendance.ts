export type AttendanceStatus = "present" | "absent" | "cancelled";

export interface AttendanceRecordLike {
  status: AttendanceStatus | string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  cancelled: number;
  counted: number;
  percentage: number;
  hasClasses: boolean;
}

/**
 * Compute attendance stats. "cancelled" (Off) records are excluded from
 * both numerator and denominator. Returns hasClasses=false when there are
 * no Present/Absent records (display "No classes yet" instead of 0%).
 */
export function computeAttendance(records: AttendanceRecordLike[]): AttendanceStats {
  let present = 0;
  let absent = 0;
  let cancelled = 0;
  for (const r of records) {
    if (r.status === "present") present++;
    else if (r.status === "absent") absent++;
    else if (r.status === "cancelled") cancelled++;
  }
  const counted = present + absent;
  const percentage = counted === 0 ? 0 : Math.round((present / counted) * 100);
  return { present, absent, cancelled, counted, percentage, hasClasses: counted > 0 };
}
