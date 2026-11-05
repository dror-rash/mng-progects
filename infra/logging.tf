# ---------- Logs ----------
# Invite links carry a secret token in the path (/dashboard/invite/<token>, task 028). Keep those requests
# out of Cloud Run's request logs for the zones that see them: the shell (public origin) and the dashboard
# (the shell's rewrite proxies to it with the same path). Case-insensitive and tolerant of repeated slashes,
# which still reach the route. /dashboard/invite itself, without a token, is kept. Main's and the previews'.
locals {
  invite_log_services = [for key, runtime in local.runtimes : runtime.service_name if contains(["shell", "dashboard"], runtime.zone)]
}

resource "google_logging_project_exclusion" "invite_tokens" {
  name        = "cloud-run-invite-tokens"
  description = "Cloud Run request logs of invite links: the path carries a secret token (task 028)."
  filter      = <<-EOT
    resource.type = "cloud_run_revision"
    resource.labels.service_name = (${join(" OR ", [for name in sort(local.invite_log_services) : "\"${name}\""])})
    log_id("run.googleapis.com/requests")
    httpRequest.requestUrl =~ "(?i)/dashboard/+invite/+[^/?#]+"
  EOT

  depends_on = [google_project_service.enabled]
}
