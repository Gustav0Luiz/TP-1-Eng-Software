#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Run Backend Tests ---
echo "\n[TEST] Running backend unit and integration tests..."
(cd backend && npm test)
echo "[TEST] Backend tests completed successfully."

# Placeholder for frontend tests
echo "Frontend tests to be implemented..."

# Run E2E tests
echo "Running E2E tests..."
npm run test:e2e
echo "[TEST] End-to-end tests completed successfully."


echo "\nAll tests passed!"
