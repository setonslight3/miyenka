/**
 * Serialises structured data for embedding in a <script type="application/ld+json"> block.
 *
 * JSON.stringify does not escape `<`, so a stored value containing
 * `</script>` would close the block early and everything after it would be
 * parsed as markup. Escaping `<`, `>` and `&` to their \u form keeps the JSON
 * semantically identical while making that impossible.
 *
 * Product names, descriptions and fabrics come from the database, so although
 * they are admin-authored rather than visitor-authored, they are still stored
 * content and are treated as untrusted here.
 */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
