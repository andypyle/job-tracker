/**
 * Up to two initials from a name, for Avatar: "Acme Corp" → "AC", "google" → "G".
 * Words are runs of letters or digits, so punctuation ("Acme, Inc.") and symbols are skipped.
 * Returns '' when there's nothing to use, which makes Avatar fall back to its icon.
 */
export function getInitials(name: string | null | undefined): string {
  const words = name?.match(/[\p{L}\p{N}]+/gu) ?? []
  return words
    .slice(0, 2)
    .map((word) => Array.from(word)[0].toLocaleUpperCase())
    .join('')
}
