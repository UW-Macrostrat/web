#!/bin/bash

set -euo pipefail

# Load .env file from two directories up
ENV_PATH="$(dirname "$(dirname "$PWD")")/.env"
if [[ -f "$ENV_PATH" ]]; then
  # Use `set -a` to automatically export all variables
  set -a
  source "$ENV_PATH"
  set +a
else
  echo "❌ .env file not found at $ENV_PATH"
  exit 1
fi

# Check required env vars
REQUIRED_VARS=(S3_ENDPOINT S3_BUCKET S3_PATH S3_ACCESS_KEY S3_SECRET_KEY)
for var in "${REQUIRED_VARS[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  fi
done

# File to upload
FILE="david.jpg"
if [[ ! -f "$FILE" ]]; then
  echo "❌ File '$FILE' not found in current directory."
  exit 1
fi

# Configure rclone using environment variables (no config file needed)
export RCLONE_CONFIG_S3_TYPE="s3"
export RCLONE_CONFIG_S3_PROVIDER="Minio"
export RCLONE_CONFIG_S3_ACCESS_KEY_ID="$S3_ACCESS_KEY"
export RCLONE_CONFIG_S3_SECRET_ACCESS_KEY="$S3_SECRET_KEY"
export RCLONE_CONFIG_S3_ENDPOINT="$S3_ENDPOINT"
export RCLONE_CONFIG_S3_ENV_AUTH="false"

# Final destination path
DESTINATION="s3:/${S3_PATH}"
echo "⬆️  Uploading '$FILE' to '$DESTINATION'..."
rclone copy "$FILE" "$DESTINATION" --s3-no-check-bucket --s3-upload-concurrency=4 --progress

echo "✅ Upload complete!"
