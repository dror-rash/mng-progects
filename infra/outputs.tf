output "registry" {
  description = "Image repository prefix."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}

output "gcp_wif_provider" {
  description = "Set as GitHub repo variable GCP_WIF_PROVIDER."
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "gcp_deployer_sa" {
  description = "Set as GitHub repo variable GCP_DEPLOYER_SA."
  value       = google_service_account.deployer.email
}

output "service_urls" {
  value = { for k, s in google_cloud_run_v2_service.zone : k => s.uri }
}

output "gcp_cloudsql_connection" {
  description = "Set as GitHub repo variable GCP_CLOUDSQL_CONNECTION."
  value       = google_sql_database_instance.main.connection_name
}
