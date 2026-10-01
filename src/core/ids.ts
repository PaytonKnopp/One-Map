/**
 * Stable-ID rules shared by entity IDs, registry keys (type/relation names),
 * layer IDs, and map IDs: lowercase kebab-case, no leading/trailing hyphen,
 * no consecutive hyphens. IDs are immutable once assigned — renaming an
 * entity changes its `name`, never its `id` (see scripts/rename-id, M5).
 */
export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidId(value: string): boolean {
  return ID_PATTERN.test(value);
}

/** Converts arbitrary text into a candidate kebab-case ID. Not guaranteed unique. */
export function toKebabCase(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
