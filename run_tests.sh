#!/bin/bash

overall_status=0

run_step() {
  local description="$1"
  shift
  printf "\n[TEST] Running %s...\n" "$description"
  if "$@"; then
    printf "[TEST] %s completed successfully.\n" "$description"
  else
    printf "[TEST] %s failed (continuing).\n" "$description"
    overall_status=1
  fi
}

# --- Backend ---
run_step "backend unit and integration tests" bash -lc "cd backend && npm test -- --coverage"

read -n 1 -s -r -p $'\nPressione qualquer tecla para iniciar os testes do frontend...'
printf "\n"

# --- Frontend ---
run_step "frontend unit tests" bash -lc "cd frontend && npm test -- --coverage --runTestsByPath \
  tests/app/alertas.page.test.tsx \
  tests/app/registrar.page.test.tsx \
  tests/app/buscar.page.test.tsx \
  tests/components/Header.test.tsx \
  tests/app/login.page.test.tsx \
  tests/app/edition.page.test.tsx \
  tests/app/home.page.test.tsx \
  tests/components/ArticleCarousel.test.tsx \
  tests/app/event.page.test.tsx \
  tests/components/Footer.test.tsx \
  tests/app/user.index.page.test.tsx"

# --- E2E ---
run_step "end-to-end tests" npm run test:e2e

if [ "$overall_status" -eq 0 ]; then
  printf "\nAll tests passed!\n"
else
  printf "\nSome tests failed. Review logs above.\n"
fi

exit "$overall_status"
