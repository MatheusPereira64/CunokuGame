import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fit<T>(flag: boolean | undefined, whenTrue: T, whenFalse: T): T {
  return flag ? whenTrue : whenFalse;
}
