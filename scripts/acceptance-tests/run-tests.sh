#!/bin/bash
set -e

# Start dev server in its own process group (with setsid)
setsid yarn run dev &
DEV_PID=$!

# Wait until the server accepts connections (up to ~2 minutes) rather than a
# fixed delay: startup (docs assembly, Vite) runs close to any fixed figure,
# and a request sent before the server listens fails outright (curl exit 7).
# The first request may then wait out the cold compile, as before.
for i in $(seq 1 60); do
  curl -s -o /dev/null "${TEST_BASE_URL:-http://localhost:3000}/" && break
  sleep 2
done

# Run acceptance tests
echo "Running acceptance tests..."
bash scripts/acceptance-tests/main.sh work
TEST_EXIT_CODE=$?

# Kill the whole process group
echo "Shutting down dev server..."
kill -TERM -$DEV_PID  # note the minus sign before PID to signal the whole process group

exit $TEST_EXIT_CODE
