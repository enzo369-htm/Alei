/**
 * Parte SQL para el driver HTTP de Neon (una sentencia por request).
 * No soporta bloques $$…$$. Si una migración los necesita, corrila a mano.
 *
 * Los comentarios `--` al inicio de un chunk NO se tiran junto con la sentencia:
 * se despegan primero. El filtro viejo (`startsWith('--')`) se comía
 * CREATE TABLE media porque el archivo empieza con un comentario.
 */
export function splitSqlStatements(contents) {
  return contents
    .split(/;\s*\n/)
    .map((chunk) =>
      chunk
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => {
          const trimmed = line.trim()
          return trimmed.length > 0 && !trimmed.startsWith('--')
        })
        .join('\n')
        .trim(),
    )
    .filter((statement) => statement.length > 0)
}
