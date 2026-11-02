export type StorageConfig = {
  bucket: string;
  /** The local fake-gcs-server (docker-compose.yml); null for Google Cloud Storage itself. */
  localUrl: string | null;
};

/**
 * The storage settings from the environment: `STORAGE_BUCKET`, and locally `STORAGE_LOCAL_URL`. Not
 * `STORAGE_EMULATOR_HOST`: the Google client reads that one itself and would override the API path.
 */
export function readStorageConfig(env: Record<string, string | undefined>): StorageConfig {
  const bucket = env.STORAGE_BUCKET?.trim();
  if (!bucket) {
    throw new Error("Set STORAGE_BUCKET (see .env.example)");
  }
  return { bucket, localUrl: env.STORAGE_LOCAL_URL?.trim().replace(/\/$/, "") || null };
}
