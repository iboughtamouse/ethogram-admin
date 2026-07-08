/** "Kestrel Corner (2)" → "kestrel-corner-2", matching the API's slug rule. */
export function suggestSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
