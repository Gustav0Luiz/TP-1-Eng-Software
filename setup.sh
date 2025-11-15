#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# --- Backend Dependencies ---
echo "\n[SETUP] Installing backend dependencies..."
cd backend
npm install
cd ..
echo "[SETUP] Backend dependencies installed successfully."

# --- Root Dependencies (for Cypress) ---
echo "\n[SETUP] Installing root dependencies for E2E tests..."
npm install
echo "[SETUP] Root dependencies installed successfully."


echo "\nSetup complete! You can now run the tests."
