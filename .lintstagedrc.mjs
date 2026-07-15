export default {
  "frontend/**/*.{ts,tsx}": [
    "eslint --fix",
    "vitest run --passWithNoTests --changed",
  ],
  "backend/**/*.py": [
    "ruff check --fix",
  ],
  "*.{json,md,yml,yaml}": [
    "prettier --check --ignore-unknown",
  ],
};
