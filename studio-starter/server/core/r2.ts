import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { hasR2, requireEnv } from './env.ts'

export { hasR2 }

export function r2Client() {
  if (!hasR2()) throw new Error('Faltan variables de R2')
  const accountId = requireEnv('R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  })
}

export function publicUrlFor(key: string) {
  const base = requireEnv('R2_PUBLIC_BASE_URL').trim().replace(/\/+$/, '')
  return `${base}/${key}`
}

export async function uploadToR2(key: string, body: Buffer, contentType: string) {
  const client = r2Client()
  await client.send(
    new PutObjectCommand({
      Bucket: requireEnv('R2_BUCKET'),
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  )
  return publicUrlFor(key)
}

export async function deleteFromR2(key: string) {
  const client = r2Client()
  await client.send(
    new DeleteObjectCommand({
      Bucket: requireEnv('R2_BUCKET'),
      Key: key,
    }),
  )
}
