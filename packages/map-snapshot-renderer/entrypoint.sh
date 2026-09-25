#!/usr/bin/env bash
# The renderer container: render every map snapshot the site lists and, when a
# bucket is configured, publish them where the site reads them.
#
#   MAP_SNAPSHOTS_SITE_URL       the site to render (required)
#   MAP_SNAPSHOTS_OUT            working directory (default /snapshots)
#   MAP_SNAPSHOTS_ONLY           comma list of kind/id to render (default all)
#   MAP_SNAPSHOTS_TIMEOUT_MS     per-view settle timeout (default 120000)
#
#   MAP_SNAPSHOTS_S3_BUCKET      unset: render only, leave the files in OUT
#   MAP_SNAPSHOTS_S3_PREFIX      default web/map-snapshots
#   MAP_SNAPSHOTS_S3_ENDPOINT    e.g. https://storage.macrostrat.org
#   MAP_SNAPSHOTS_S3_ACCESS_KEY
#   MAP_SNAPSHOTS_S3_SECRET_KEY
#   MAP_SNAPSHOTS_S3_ACL         default public-read; empty to send none
#
# The site then reads them with
#   VITE_MACROSTRAT_MAP_SNAPSHOTS_URL=<public URL of bucket/prefix>
set -euo pipefail

: "${MAP_SNAPSHOTS_SITE_URL:?set MAP_SNAPSHOTS_SITE_URL to the site to render}"
export MAP_SNAPSHOTS_OUT="${MAP_SNAPSHOTS_OUT:-/snapshots}"
mkdir -p "$MAP_SNAPSHOTS_OUT"

remote=""
if [[ -n "${MAP_SNAPSHOTS_S3_BUCKET:-}" ]]; then
  # An rclone remote named `snapshots`, configured from the environment so no
  # config file (or secret mount) is needed.
  export RCLONE_CONFIG=/notfound
  export RCLONE_CONFIG_SNAPSHOTS_TYPE=s3
  export RCLONE_CONFIG_SNAPSHOTS_PROVIDER=Ceph
  export RCLONE_CONFIG_SNAPSHOTS_ENDPOINT="${MAP_SNAPSHOTS_S3_ENDPOINT:?set MAP_SNAPSHOTS_S3_ENDPOINT}"
  export RCLONE_CONFIG_SNAPSHOTS_ACCESS_KEY_ID="${MAP_SNAPSHOTS_S3_ACCESS_KEY:?set MAP_SNAPSHOTS_S3_ACCESS_KEY}"
  export RCLONE_CONFIG_SNAPSHOTS_SECRET_ACCESS_KEY="${MAP_SNAPSHOTS_S3_SECRET_KEY:?set MAP_SNAPSHOTS_S3_SECRET_KEY}"
  export RCLONE_CONFIG_SNAPSHOTS_ACL="${MAP_SNAPSHOTS_S3_ACL-public-read}"
  remote="snapshots:${MAP_SNAPSHOTS_S3_BUCKET}/${MAP_SNAPSHOTS_S3_PREFIX:-web/map-snapshots}"

  # Start from the published manifest, so a partial run (MAP_SNAPSHOTS_ONLY, or
  # a view that fails) keeps the entries it didn't redraw.
  if ! rclone copyto "$remote/manifest.json" "$MAP_SNAPSHOTS_OUT/manifest.json" 2>/dev/null; then
    echo "No published manifest at $remote yet; starting a new one."
  fi
fi

status=0
yarn workspace @macrostrat-web/map-snapshot-renderer run render || status=$?

if [[ -n "$remote" && -f "$MAP_SNAPSHOTS_OUT/manifest.json" ]]; then
  # Images first and the manifest last, so the published manifest never names
  # a file that isn't there yet. Image URLs carry `?v=<renderedAt>`, so they
  # can be cached hard; the manifest is what changes.
  rclone copy "$MAP_SNAPSHOTS_OUT" "$remote" \
    --exclude manifest.json \
    --header-upload "Cache-Control: public, max-age=31536000"
  rclone copyto "$MAP_SNAPSHOTS_OUT/manifest.json" "$remote/manifest.json" \
    --header-upload "Cache-Control: public, max-age=60"
  echo "Published to $remote"
fi

exit "$status"
