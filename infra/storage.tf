# ---------- Files (task 057, ADR-0008) ----------
# Browsers upload and download through short-lived signed URLs; the bytes never pass through the app.
# Two buckets: main's, and one shared by all PR previews (test data only, deleted after 14 days).
# deploy-service.sh sets STORAGE_BUCKET on the dashboard to the matching name.

locals {
  # The zone that reads and writes files (packages/storage is used by apps/dashboard only).
  files_zone = "dashboard"

  # The browser's origin is the shell's (the dashboard is proxied under /dashboard). Cloud Run answers on
  # more than one URL per service (the hashed *.a.run.app one and shell-<project number>.<region>.run.app);
  # `urls` lists them all.
  shell_origins = distinct(concat([google_cloud_run_v2_service.zone["shell"].uri], google_cloud_run_v2_service.zone["shell"].urls))

  files_cors_methods          = ["PUT", "GET"]
  files_cors_response_headers = ["Content-Type", "x-goog-if-generation-match"]
}

# Main: no lifecycle rule. Attachments are soft-deleted in the database and must stay restorable.
resource "google_storage_bucket" "files" {
  name                        = "${var.project_id}-files"
  location                    = upper(var.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  cors {
    origin          = local.shell_origins
    method          = local.files_cors_methods
    response_header = local.files_cors_response_headers
    max_age_seconds = 3600
  }

  depends_on = [google_project_service.enabled]
}

# Previews: objects are deleted 14 days after upload; no soft-delete retention (nothing to restore).
resource "google_storage_bucket" "files_preview" {
  name                        = "${var.project_id}-files-preview"
  location                    = upper(var.region)
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = true

  # Preview origins are tagged URLs (https://pr-<N>---shell-….run.app), one per PR, and GCS CORS origins are
  # exact strings or "*" (no wildcard inside a host). "*" here only: it lets any page's script read a
  # response, but every request still needs a URL the app signed, and a signed URL works without CORS
  # anyway (curl). This bucket holds test data only.
  cors {
    origin          = ["*"]
    method          = local.files_cors_methods
    response_header = local.files_cors_response_headers
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 14
    }
    action {
      type = "Delete"
    }
  }

  soft_delete_policy {
    retention_duration_seconds = 0
  }

  depends_on = [google_project_service.enabled]
}

# Only the dashboard's runtime identity touches objects: create (signed PUT), read (signed GET, stat) and
# delete (remove). Preview and main revisions are the same service and identity, so it gets both buckets.
resource "google_storage_bucket_iam_member" "files_zone_objects" {
  for_each = {
    main    = google_storage_bucket.files.name
    preview = google_storage_bucket.files_preview.name
  }
  bucket = each.value
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.runtime[local.files_zone].email}"
}

# Signed URLs on Cloud Run have no key file: the client signs through the IAM Credentials API
# (signBlob) as its own service account, which needs Token Creator on itself.
resource "google_service_account_iam_member" "files_zone_signs_urls" {
  service_account_id = google_service_account.runtime[local.files_zone].name
  role               = "roles/iam.serviceAccountTokenCreator"
  member             = "serviceAccount:${google_service_account.runtime[local.files_zone].email}"
}
