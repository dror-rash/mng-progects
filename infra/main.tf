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
    "storage.googleapis.com",
    "logging.googleapis.com",
  ]

  # Main and PR previews share the project and the Cloud Run services but nothing they could leak through:
  # each has its own deployer, runtime identities, database logins, database, auth secret and bucket. The
  # deploy workflow takes the same names from infra/scripts/environment.sh; its test compares the two.
  environments = {
    main = {
      db_name        = "app"
      db_login       = "app" # the runtime switches to app_user on connect (ADR-0006)
      db_secret      = "db-password"
      migrate_login  = "app" # the Cloud SQL user below
      migrate_secret = "db-password"
      auth_secret    = "better-auth-secret"
      runtime_suffix = "runtime" # <zone>-runtime
      bucket_suffix  = "files"
    }
    preview = {
      db_name        = "app_preview"
      db_login       = "preview_runtime" # created by infra/scripts/provision-db-logins.mjs
      db_secret      = "db-preview-password"
      migrate_login  = "preview_owner" # created by infra/scripts/provision-db-logins.mjs
      migrate_secret = "db-preview-owner-password"
      auth_secret    = "better-auth-secret-preview"
      runtime_suffix = "preview" # <zone>-preview
      bucket_suffix  = "files-preview"
    }
  }

  # Every secret: the database passwords and the auth secrets of both environments.
  secret_names = toset(flatten([for env in values(local.environments) : [env.db_secret, env.migrate_secret, env.auth_secret]]))

  # Which database passwords each deployer reads. Main provisions the preview logins (it sets their
  # passwords), so it reads theirs too; previews never read db-password. No deployer reads an auth secret.
  deployer_secrets = {
    main    = distinct([local.environments.main.migrate_secret, local.environments.preview.migrate_secret, local.environments.preview.db_secret])
    preview = distinct([local.environments.preview.migrate_secret, local.environments.preview.db_secret])
  }

  # One runtime identity per zone and environment, keyed "<zone>/<environment>".
  runtimes = {
    for pair in setproduct(var.zones, keys(local.environments)) : "${pair[0]}/${pair[1]}" => {
      zone        = pair[0]
      environment = pair[1]
      account_id  = "${pair[0]}-${local.environments[pair[1]].runtime_suffix}"
    }
  }
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

  # Images are packages per environment and zone (main/<zone>, preview/<zone>; environment.sh IMAGE_PREFIX),
  # tagged with the commit SHA. KEEP wins over DELETE and counts per package, so the 10 newest versions of
  # each stay whatever their age, and preview pushes can't push main's live image out. Any other version
  # goes after 30 days, tagged or not.
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-10-newest"
    action = "KEEP"
    most_recent_versions {
      keep_count = 10
    }
  }
  cleanup_policies {
    id     = "delete-after-30-days"
    action = "DELETE"
    condition {
      tag_state  = "ANY"
      older_than = "2592000s" # 30 days
    }
  }

  depends_on = [google_project_service.enabled]
}

# ---------- Runtime identities (per zone and environment, least privilege) ----------
resource "google_service_account" "runtime" {
  for_each     = local.runtimes
  account_id   = each.value.account_id
  display_name = "Runtime identity for ${each.value.zone} (${each.value.environment})"
  depends_on   = [google_project_service.enabled]
}

# ---------- Cloud Run services ----------
# Terraform creates the service with a placeholder image. GitHub Actions deploys real images,
# so image/traffic/labels are ignored here to avoid Terraform reverting deployments. Deploys also set the
# revision's identity (main or preview), so that is ignored too.
resource "google_cloud_run_v2_service" "zone" {
  for_each            = var.zones
  name                = each.key
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.runtime["${each.key}/main"].email

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
      template[0].service_account,
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
# Two deployers: `main` only for pushes to main, `preview` only for pull_request runs (both of this repository).
resource "google_service_account" "deployer" {
  for_each     = local.environments
  account_id   = "deployer-${each.key}"
  display_name = "Deploys ${each.key} from GitHub Actions"
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
    "attribute.event_name" = "assertion.event_name"
    # Which deployer a token may use: a push to main -> main, a pull_request run -> preview, else none.
    # (pull_request_target, workflow_dispatch and other branches get neither.)
    "attribute.deploy_target" = "assertion.event_name == 'push' && assertion.ref == 'refs/heads/main' ? 'main' : (assertion.event_name == 'pull_request' ? 'preview' : 'none')"
  }

  # Only tokens from this repository can authenticate.
  attribute_condition = "assertion.repository == \"${var.github_repository}\""

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

resource "google_service_account_iam_member" "github_can_impersonate_deployer" {
  for_each           = local.environments
  service_account_id = google_service_account.deployer[each.key].name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.deploy_target/${each.key}"
}

# Deployer permissions, on the resources rather than the project. run.developer deploys revisions and moves
# traffic/tags, but can't change who may invoke a service (Terraform owns the allUsers binding above).
resource "google_cloud_run_v2_service_iam_member" "deployer_run_developer" {
  for_each = { for pair in setproduct(var.zones, keys(local.environments)) : "${pair[0]}/${pair[1]}" => { zone = pair[0], environment = pair[1] } }
  location = var.region
  name     = google_cloud_run_v2_service.zone[each.value.zone].name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deployer[each.value.environment].email}"
}

resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  for_each   = local.environments
  location   = google_artifact_registry_repository.images.location
  repository = google_artifact_registry_repository.images.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer[each.key].email}"
}

# Deploying a revision "acts as" its runtime identity: each deployer only its own environment's.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  for_each           = local.runtimes
  service_account_id = google_service_account.runtime[each.key].name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer[each.value.environment].email}"
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
  for_each = toset([for env in values(local.environments) : env.db_name])
  name     = each.key
  instance = google_sql_database_instance.main.name
}

# Main's owner login: runs main's migrations, provisions the preview logins, and is main's runtime login
# (switching to app_user, ADR-0006). The preview logins (preview_owner, preview_runtime) are created by
# infra/scripts/provision-db-logins.mjs on main deploys, not here: Cloud SQL makes every API-created user a
# member of cloudsqlsuperuser, which owns the databases.
resource "google_sql_user" "app" {
  name     = local.environments.main.migrate_login
  instance = google_sql_database_instance.main.name
  password = random_password.secret[local.environments.main.migrate_secret].result
}

# ---------- Secrets ----------
# NOTE: secret values also live in Terraform state, so keep the state bucket private.
resource "random_password" "secret" {
  for_each = local.secret_names
  length   = startswith(each.key, "db-") ? 32 : 48
  special  = false
}

resource "google_secret_manager_secret" "secret" {
  for_each  = random_password.secret
  secret_id = each.key
  replication {
    auto {}
  }
  depends_on = [google_project_service.enabled]
}

resource "google_secret_manager_secret_version" "secret" {
  for_each    = random_password.secret
  secret      = google_secret_manager_secret.secret[each.key].id
  secret_data = each.value.result
}

# Each runtime identity reads its own environment's database password and auth secret, nothing else.
# Every zone of an environment shares them (any zone can validate a session).
resource "google_secret_manager_secret_iam_member" "runtime_reads_secrets" {
  for_each = merge([
    for key, runtime in local.runtimes : {
      for secret in [local.environments[runtime.environment].db_secret, local.environments[runtime.environment].auth_secret] :
      "${key}/${secret}" => { runtime = key, secret = secret }
    }
  ]...)
  secret_id = google_secret_manager_secret.secret[each.value.secret].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime[each.value.runtime].email}"
}

resource "google_project_iam_member" "runtime_cloudsql_client" {
  for_each = local.runtimes
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.runtime[each.key].email}"
}

# The deployers run migrations, provisioning and the role check through the Cloud SQL Auth Proxy.
resource "google_project_iam_member" "deployer_cloudsql_client" {
  for_each = local.environments
  project  = var.project_id
  role     = "roles/cloudsql.client"
  member   = "serviceAccount:${google_service_account.deployer[each.key].email}"
}

resource "google_secret_manager_secret_iam_member" "deployer_reads_db_passwords" {
  for_each = merge([
    for env, secrets in local.deployer_secrets : { for secret in secrets : "${env}/${secret}" => { deployer = env, secret = secret } }
  ]...)
  secret_id = google_secret_manager_secret.secret[each.value.secret].id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.deployer[each.value.deployer].email}"
}
