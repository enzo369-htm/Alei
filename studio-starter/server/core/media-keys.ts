/** Keys de R2 de una fila: el principal más cada variante. Sin duplicados. */
export function r2KeysOf(r2Key: string | null | undefined, variants: unknown): string[] {
  const keys = new Set<string>()
  if (r2Key) keys.add(r2Key)
  if (variants && typeof variants === 'object' && variants !== null && 'widths' in variants) {
    const widths = (variants as { widths?: unknown }).widths
    if (Array.isArray(widths)) {
      for (const item of widths) {
        if (item && typeof item === 'object' && 'key' in item && typeof item.key === 'string' && item.key) {
          keys.add(item.key)
        }
      }
    }
  }
  return [...keys]
}
