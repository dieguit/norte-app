import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let cachedClient: S3Client | null = null
let cachedBucket: string | null = null

function getR2Client() {
  if (cachedClient && cachedBucket) {
    return { client: cachedClient, bucket: cachedBucket }
  }

  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 configuration.')
  }

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
  cachedBucket = bucket

  return { client: cachedClient, bucket: cachedBucket }
}

export function signUpload(key: string, contentType: string) {
  const { client, bucket } = getR2Client()
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), {
    expiresIn: 300,
  })
}

export function deleteUpload(key: string) {
  const { client, bucket } = getR2Client()
  return client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

export function signDownload(key: string) {
  const { client, bucket } = getR2Client()
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: 300 })
}
