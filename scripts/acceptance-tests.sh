set -euo pipefail

# Load .env file
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Use TEST_BASE_URL or default to localhost
BASE_URL=${TEST_BASE_URL:-http://localhost:3000}

echo "Testing against: $BASE_URL"

urls=(
  "/"
  "/map/loc"
  "/#/sift/"
  "/lex/strat-names/1"
  "/lex/intervals/10"
)

for path in "${urls[@]}"; do
  url="${BASE_URL}${path}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [[ "$status" != "200" ]]; then
    echo "Unexpected status code: $status for $url"
    exit 1
    else
    echo "Success: $url returned status code $status"
  fi
done