#!/usr/bin/env bash
# Tests for infra/scripts/deploy-service.sh and service-url.sh (task 068) with a stub `gcloud` that logs its
# arguments: previews deploy to <zone>-preview as the preview identity, main to <zone>, always by digest.
# No GCP access needed. Run: bash infra/scripts/test-deploy-service.sh
set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir "$TMP/bin"
cat > "$TMP/bin/gcloud" <<'STUB'
#!/usr/bin/env bash
echo "$*" >> "$GCLOUD_LOG"
if [ "$1 $2 $3" = "run services describe" ]; then
  case "$*" in
    *--format=json*) printf '{"status":{"traffic":[{"tag":"pr-7","url":"https://pr-7---%s-abc.a.run.app"}]}}\n' "$4" ;;
    *) echo "https://$4-123.me-west1.run.app" ;;
  esac
fi
STUB
chmod +x "$TMP/bin/gcloud"

pass=0; fail=0
check() { # name, command...
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then pass=$((pass+1)); echo "ok   - $name"; else fail=$((fail+1)); echo "FAIL - $name"; fi
}
DIGEST="me-west1-docker.pkg.dev/demo/images-preview/dashboard@sha256:$(printf 'a%.0s' $(seq 64))"
run() { # is_pr, script, args...
  local is_pr="$1"; shift
  : > "$TMP/log"
  PATH="$TMP/bin:$PATH" GCLOUD_LOG="$TMP/log" PROJECT=demo REGION=me-west1 CLOUDSQL_CONNECTION=demo:me-west1:app-db \
    IS_PR="$is_pr" PR_NUMBER=7 bash "$DIR/$@"
}
deployed() { grep "^run deploy" "$TMP/log"; }

run true deploy-service.sh dashboard "$DIGEST" >/dev/null 2>&1
check "a preview deploys to dashboard-preview"             sh -c "grep -q '^run deploy dashboard-preview ' '$TMP/log'"
check "a preview runs as dashboard-preview"                sh -c "grep -q -- '--service-account dashboard-preview@demo.iam.gserviceaccount.com' '$TMP/log'"
check "a preview is a tagged no-traffic revision"          sh -c "grep -q -- '--no-traffic --tag pr-7' '$TMP/log'"
check "a preview deploys the image by digest"              sh -c "grep -q -- '--image $DIGEST' '$TMP/log'"
check "a preview gets the preview bucket"                  sh -c "grep -q 'STORAGE_BUCKET=demo-files-preview' '$TMP/log'"
check "a preview runs a pool of 2 per instance"            sh -c "grep -Eq '[ ,]DB_POOL_MAX=2(,| |$)' '$TMP/log'"

run false deploy-service.sh shell "${DIGEST/dashboard/shell}" >/dev/null 2>&1
check "main deploys to shell"                              sh -c "grep -q '^run deploy shell ' '$TMP/log'"
check "main takes BETTER_AUTH_URL from the main shell"     sh -c "grep -q 'BETTER_AUTH_URL=https://shell-123.me-west1.run.app' '$TMP/log'"
check "main isn't tagged"                                  sh -c "! grep -q -- '--tag' '$TMP/log'"
check "main runs a pool of 4 per instance"                 sh -c "grep -Eq '[ ,]DB_POOL_MAX=4(,| |$)' '$TMP/log'"

: > "$TMP/log"
check "refuses an image without a digest"                  sh -c "! PATH='$TMP/bin:$PATH' GCLOUD_LOG='$TMP/log' PROJECT=demo REGION=me-west1 CLOUDSQL_CONNECTION=x IS_PR=false bash '$DIR/deploy-service.sh' shell me-west1-docker.pkg.dev/demo/images/shell:abc"
check "and deploys nothing then"                           sh -c "! grep -q '^run deploy' '$TMP/log'"

check "a preview's URL is the pr-<N> tag of shell-preview" test "$(run true service-url.sh shell 2>/dev/null)" = "https://pr-7---shell-preview-abc.a.run.app"
check "main's URL is the shell service's"                  test "$(run false service-url.sh shell 2>/dev/null)" = "https://shell-123.me-west1.run.app"

echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
