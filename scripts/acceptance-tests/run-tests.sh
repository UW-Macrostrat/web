#!/bin/bash
set -e

# Start dev server in its own process group (with setsid)
setsid yarn run dev &
DEV_PID=$!

# Wait for server to start
sleep 10

# Run acceptance tests
echo "Running acceptance tests..."
bash scripts/acceptance-tests/main.sh work
TEST_EXIT_CODE=$?

# Kill the whole process group
echo "Shutting down dev server..."
kill -TERM -$DEV_PID  # note the minus sign before PID to signal the whole process group

exit $TEST_EXIT_CODE
