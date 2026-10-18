locals {
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
    "sts.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "sqladmin.googleapis.com",
  ]
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# ---------- Container registry ----------
resource "google_artifact_registry_repository" "images" {
  repository_id = "app"
  location      = var.region
  format        = "DOCKER"
  description   = "Zone images built by GitHub Actions"
  depends_on    = [google_project_service.enabled]
}

# ---------- Runtime identities (one per zone, least privilege) ----------
resource "google_service_account" "runtime" {
  for_each     = var.zones
  account_id   = "${each.key}-runtime"
  display_name = "Runtime identity for ${each.key}"
  depends_on   = [google_project_service.enabled]
}

# ---------- Cloud Run services ----------
# Terraform creates the service with a placeholder image. GitHub Actions deploys real images,
# so image/traffic/labels are ignored here to avoid Terraform reverting deployments.
resource "google_cloud_run_v2_service" "zone" {
  for_each            = var.zones
  name                = each.key
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime[each.key].email

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      client,
      client_version,
      traffic,
      template[0].containers[0].image,
      template[0].containers[0].env,
      template[0].containers[0].volume_mounts,
      template[0].volumes,
      template[0].labels,
      template[0].annotations,
      template[0].revision,
    ]
  }

  depends_on = [google_project_service.enabled]
}

# Public access. If your org policy blocks allUsers, front the shell with a load balancer/IAP instead.
resource "google_cloud_run_v2_service_iam_member" "public" {
  for_each = var.zones
  location = var.region
  name     = google_cloud_run_v2_service.zone[each.key].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# ---------- GitHub Actions -> GCP (Workload Identity Federation, no JSON keys) ----------
resource "google_service_account" "deployer" {
  account_id   = "github-deployer"
  display_name = "Deploys from GitHub Actions"
  depends_on   = [google_project_service.enabled]
}

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github"
  display_name              = "GitHub Actions"
  depends_on                = [google_project_service.enabled]
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  display_name                       = "GitHub OIDC"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Only tokens from this repository can authenticate.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_can_impersonate_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}

# Deployer permissions
resource "google_project_iam_member" "deployer_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer.email}"
}

# Deploying a service "acts as" its runtime identity.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  for_each           = var.zones
  service_account_id = google_service_account.runtime[each.key].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

# ---------- Database (Cloud SQL Postgres) ----------
# Cloud Run reaches it through the built-in Cloud SQL connector (unix socket), not a public network path.
resource "google_sql_database_instance" "main" {
  name                = "app-db"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.db_deletion_protection

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      ipv4_enabled = true # no authorized networks: only IAM-authenticated connectors can connect
    }
  }

  depends_on = [google_project_service.enabled]
}

# "app" = production, "app_preview" = shared by all PR previews (never production data).
resource "google_sql_database" "databases" {
  for_each = toset(["app", "app_preview"])
  name     = each.key
  instance = google_sql_database_instance.main.name
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  name     = "app"
  instance = google_sql_database_instance.main.name
  password = random_password.db.result
}

# ---------- Secrets ----------
# NOTE: secret values also live in Terraform state, so keep the state bucket private.
resource "random_password" "auth_secret" {
  length  = 48
  special = false
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db.result
}

resource "google_secret_manager_secret" "auth_secret" {
  secret_id = "better-auth-secret"
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "auth_secret" {
  secret      = google_secret_manager_secret.auth_secret.id
  secret_data = random_password.auth_secret.result
}

# Every zone shares the same database and auth secret (any zone can validate a session).
resource "google_secret_manager_secret_iam_member" "runtime_reads_db_password" {
  for_each  = var.zones
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

resource "google_secret_manager_secret_iam_member" "runtime_reads_auth_secret" {
  for_each  = var.zones
  secret_id = google_secret_manager_secret.auth_secret.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

resource "google_project_iam_member" "runtime_cloudsql_client" {
  for_each = var.zones
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# The deployer runs migrations through the Cloud SQL Auth Proxy.
resource "google_project_iam_member" "deployer_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_secret_manager_secret_iam_member" "deployer_reads_db_password" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.deployer.email}"
}
