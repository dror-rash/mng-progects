variable "project_id" {
  description = "GCP project ID that hosts the app."
  type        = string
}

variable "region" {
  description = "Region for Cloud Run, Artifact Registry, Cloud SQL and the file buckets (this project: me-west1). Required, so a missing tfvars line can't create everything somewhere else."
  type        = string
}

variable "github_repository_id" {
  description = "Numeric id of the GitHub repo (gh api repos/<owner>/<name> --jq .id). Workload Identity checks it with the name."
  type        = string
  default     = "1424672458" # dror-rash/mng-projects
}

variable "github_repository" {
  description = "GitHub repo allowed to deploy, as owner/name."
  type        = string
}

variable "zones" {
  description = "Zone names. Each becomes a Cloud Run service named after it (must match apps/<name>)."
  type        = set(string)
  default     = ["shell", "example-zone", "dashboard"]

  validation {
    condition     = contains(var.zones, "shell") && contains(var.zones, "dashboard")
    error_message = "zones must include \"shell\" (the public origin) and \"dashboard\" (it owns the file buckets)."
  }
}

variable "min_instances" {
  description = "Minimum Cloud Run instances per zone. 0 = scale to zero (cheapest, has cold starts)."
  type        = number
  default     = 0
}

variable "preview_max_instances" {
  description = "Maximum Cloud Run instances per preview zone. 1 keeps previews within preview_runtime's connection limit."
  type        = number
  default     = 1
}

variable "max_instances" {
  type    = number
  default = 5
}

variable "db_tier" {
  description = "Cloud SQL machine tier. db-f1-micro is the cheapest; use a dedicated-core tier for production load."
  type        = string
  default     = "db-f1-micro"
}

variable "db_deletion_protection" {
  description = "Block terraform destroy of the database instance."
  type        = bool
  default     = true
}
