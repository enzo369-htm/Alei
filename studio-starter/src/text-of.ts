export type Lang = 'es' | 'en'

/** Inglés solo si el idioma activo es en y el texto, recortado, no está vacío. Si no, español. */
export function textOf(primary: string, english: string | null | undefined, lang: Lang) {
  if (lang === 'en' && english?.trim()) return english
  return primary
}
