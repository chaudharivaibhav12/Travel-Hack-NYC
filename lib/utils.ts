/** Minimal class-name joiner. Avoids pulling in clsx + tailwind-merge. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
