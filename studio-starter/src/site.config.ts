/**
 * Único archivo que se edita para registrar lo propio de cada sitio.
 * El motor no sabe nada de secciones: las lee de acá.
 */

export type AdminLink = {
  to: string
  label: string
}

export const site = {
  name: 'ALEI',

  adminLinks: [
    { to: '/admin/hero', label: 'Hero' },
    { to: '/admin/works', label: 'Works' },
    { to: '/admin/colabs', label: 'Colabs' },
    { to: '/admin/about', label: 'About' },
    { to: '/admin/media', label: 'Media' },
  ] as AdminLink[],
}
