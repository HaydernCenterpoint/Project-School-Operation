"use client";

import { createContext, useContext } from "react";
import type { StaffRole } from "@/lib/students";

export type Staff = { role: StaffRole; name: string };

export const StaffContext = createContext<Staff | null>(null);

export function useStaff() {
  const value = useContext(StaffContext);
  if (!value) throw new Error("useStaff must be used inside the management layout");
  return value;
}
