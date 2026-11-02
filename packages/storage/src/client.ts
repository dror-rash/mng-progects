import { generateKeyPairSync } from "node:crypto";

import { type Bucket, Storage } from "@google-cloud/storage";

import { readStorageConfig } from "./config";

let bucket: Bucket | undefined;

/**
 * Credentials for the local server only: it doesn't check signatures, but the client needs a key to sign
 * URLs. Made up in memory for each process, never stored. Deployed, the Cloud Run service account signs
 * through IAM, with no key at all.
 */
function localCredentials() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    client_email: "local-storage@example.com",
    private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  };
}

/** The app's bucket, configured from the environment on first use: the local server when one is set. */
export function getBucket(): Bucket {
  if (!bucket) {
    const config = readStorageConfig(process.env);
    const storage = config.localUrl
      ? new Storage({ apiEndpoint: config.localUrl, projectId: "local", credentials: localCredentials() })
      : new Storage();
    bucket = storage.bucket(config.bucket);
  }
  return bucket;
}
