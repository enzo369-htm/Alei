/** Slug de página (bio, statement, contacto). No es un uuid. */
export function isPageSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 64
}
