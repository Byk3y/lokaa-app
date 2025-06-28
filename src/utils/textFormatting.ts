export function toTitleCase(str: string): string {
  if (!str) {
    return '';
  }
  return str.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  );
} 