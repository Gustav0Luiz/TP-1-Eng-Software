#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Run Backend Tests ---
echo "\n[TEST] Running backend unit and integration tests..."
cd backend
npm test
cd ..
echo "[TEST] Backend tests completed successfully."

# --- Run E2E Tests ---
echo "\n[TEST] Running end-to-end tests (this may take a few minutes)..."
npm run test:e2e
echo "[TEST] End-to-end tests completed successfully."


echo "\nAll tests passed!"
