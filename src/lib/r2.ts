import 'server-only';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
type AllowedType = typeof ALLOWED_TYPES[number];

export function isAllowedType(t: string): t is AllowedType {
  return ALLOWED_TYPES.includes(t as AllowedType);
}

export async function getUploadUrl(contentType: AllowedType) {
  // Key SELALU di-generate server-side — jangan pernah terima dari client
  const key = `products/${crypto.randomUUID()}`;
  const cmd = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  const signedUrl = await getSignedUrl(r2, cmd, { expiresIn: 300 });
  return {
    signedUrl,
    key,
    publicUrl: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`,
  };
}
