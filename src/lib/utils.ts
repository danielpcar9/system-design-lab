import { twMerge } from "tailwind-merge";

export function cn(
  ...parts: Array<string | false | null | undefined | 0>
): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
