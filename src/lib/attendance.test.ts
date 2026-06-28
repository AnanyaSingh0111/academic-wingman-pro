import { describe, it, expect } from "vitest";
import { computeAttendance } from "./attendance";

const make = (p: number, a: number, c: number) => [
  ...Array(p).fill({ status: "present" }),
  ...Array(a).fill({ status: "absent" }),
  ...Array(c).fill({ status: "cancelled" }),
];

describe("computeAttendance", () => {
  it("3 Present, 2 Absent, 4 Off → 60%", () => {
    const s = computeAttendance(make(3, 2, 4));
    expect(s.percentage).toBe(60);
    expect(s.hasClasses).toBe(true);
  });
  it("5 Present, 0 Absent, 10 Off → 100%", () => {
    expect(computeAttendance(make(5, 0, 10)).percentage).toBe(100);
  });
  it("0 Present, 5 Absent, 2 Off → 0%", () => {
    const s = computeAttendance(make(0, 5, 2));
    expect(s.percentage).toBe(0);
    expect(s.hasClasses).toBe(true);
  });
  it("0 Present, 0 Absent, any Off → no classes", () => {
    const s = computeAttendance(make(0, 0, 7));
    expect(s.hasClasses).toBe(false);
    expect(s.counted).toBe(0);
  });
});
