output "registries" {
  description = "Image repository per environment (deploy.yml derives the same from environment.sh)."
  value       = { for env, repo in google_artifact_registry_repository.images : env => "${var.region}-docker.pkg.dev/${var.project_id}/${repo.repository_id}" }
}

output "gcp_wif_provider" {
  description = "Set as GitHub repo variable GCP_WIF_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "gcp_deployer_sa_main" {
  description = "Set as GitHub repo variable GCP_DEPLOYER_SA_MAIN (pushes to main)."
  value       = google_service_account.deployer["main"].email
}

output "gcp_deployer_sa_preview" {
  description = "Set as GitHub repo variable GCP_DEPLOYER_SA_PREVIEW (pull requests)."
  value       = google_service_account.deployer["preview"].email
}

output "service_urls" {
  description = "Cloud Run service URLs, keyed <zone>/<environment>."
  value       = { for k, s in google_cloud_run_v2_service.zone : k => s.uri }
}

output "gcp_cloudsql_connection" {
  description = "Set as GitHub repo variable GCP_CLOUDSQL_CONNECTION."
  value       = google_sql_database_instance.main.connection_name
}

output "files_buckets" {
  description = "STORAGE_BUCKET for the dashboard: main and previews (deploy-service.sh derives the same names)."
  value = {
    main    = google_storage_bucket.files.name
    preview = google_storage_bucket.files_preview.name
  }
}
