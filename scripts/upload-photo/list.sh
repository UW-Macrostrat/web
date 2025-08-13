#!/bin/bash

set -euo pipefail

# Load .env file from two directories up
ENV_PATH="$(dirname "$(dirname "$PWD")")/.env"
if [[ -f "$ENV_PATH" ]]; then
  set -a
  source "$ENV_PATH"
  set +a
else
  echo "❌ .env file not found at $ENV_PATH"
  exit 1
fi

# Check required env vars
REQUIRED_VARS=(S3_ENDPOINT S3_BUCKET S3_PATH S3_ACCESS_KEY S3_SECRET_KEY)
missing=()
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    missing+=("$var")
  fi
done
if (( ${#missing[@]} > 0 )); then
  echo "❌ Missing required environment variables: ${missing[*]}"
  exit 1
fi

# Configure rclone using environment variables (no config file needed)
export RCLONE_CONFIG_S3_TYPE="s3"
export RCLONE_CONFIG_S3_PROVIDER="Minio"
export RCLONE_CONFIG_S3_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export RCLONE_CONFIG_S3_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
export RCLONE_CONFIG_S3_ENDPOINT="$S3_ENDPOINT"
export RCLONE_CONFIG_S3_ENV_AUTH="false"

REMOTE_PATH="s3:${S3_BUCKET}/assets"

echo "🔍 Listing files in '$REMOTE_PATH'..."

rclone ls "$REMOTE_PATH" --log-level DEBUG

rclone copy "s3:macrostrat-sites/assets" ./
