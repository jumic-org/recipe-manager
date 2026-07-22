# Build Verification

## Rule

Always run the full build and lint check before creating a pull request:

```bash
pnpm nx run-many -t build lint
```

This mirrors the CI workflow (`build-and-lint`) that runs on every PR. Catching issues locally avoids failed CI runs and speeds up the review process.

## When to run

- After completing any code change
- Before committing if the change touches TypeScript, HTML, or SCSS files
- Before opening or updating a pull request
