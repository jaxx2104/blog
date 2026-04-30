# Biome Migration Design

- Status: Draft
- Date: 2026-05-01
- Owner: jaxx2104

## Background

The project currently uses ESLint 8.57.1 and Prettier 2.8.8 for linting and
formatting. ESLint 8 has reached end-of-life, the configuration still uses the
legacy `.eslintrc.json` format, and Prettier 2.x is two major versions behind.
The toolchain has accumulated dependencies that are no longer needed: Next.js
already disables ESLint during builds (`eslint.ignoreDuringBuilds: true` in
`next.config.mjs`) and the Next.js-specific rule
`@next/next/no-html-link-for-pages` is explicitly turned off, so the project
gains very little from the `next/core-web-vitals` ruleset in practice.

Biome is a Rust-based, single-binary toolchain that combines a formatter and a
linter and ships migration commands for both ESLint and Prettier
configurations. Replacing ESLint and Prettier with Biome reduces the number of
dev dependencies, simplifies configuration to a single `biome.json`, and
improves linting and formatting performance.

## Goals

- Replace ESLint and Prettier with Biome as a full drop-in.
- Keep the existing formatting style (no semicolons, 2-space indent, double
  quotes) so day-to-day editing is unchanged.
- Keep `tsc` type checking and `textlint` Japanese-text checking untouched.
- Land the migration in a single pull request, including the formatting diff
  that results from running `biome format` over the codebase.

## Non-goals

- Keeping any ESLint configuration around (no coexistence with Biome).
- Adopting Biome's `nursery` rules in this migration.
- Adding pre-commit hooks (no `husky` or `lint-staged`).
- Touching `tsc`, `textlint`, Next.js, React, or styled-components versions.

## Approach

Full replacement. ESLint and Prettier and all related plugins are removed and
replaced by `@biomejs/biome` configured through a single `biome.json`. Biome's
`recommended` ruleset plus ESLint-inspired rules pulled in via
`biome migrate eslint --include-inspired` cover the same ground as the current
ESLint configuration, with the exception of the `@next/next/*` rules that the
project does not rely on.

## Configuration

### File changes

| Operation | Path                            | Notes                                    |
|-----------|---------------------------------|------------------------------------------|
| Add       | `biome.json`                    | Single source of lint and format config. |
| Remove    | `.eslintrc.json`                | Legacy ESLint config.                    |
| Remove    | `.eslintrc.js.bak`              | Stale backup.                            |
| Remove    | `.prettierrc.js`                | Legacy Prettier config.                  |
| Update    | `package.json`                  | Scripts and devDependencies.             |
| Update    | `.github/workflows/lint.yml`    | Switch CI command to `biome ci`.         |

### Dependency changes

Add:

- `@biomejs/biome` (latest 2.2.x, pinned with `-E`)

Remove:

- `eslint`
- `eslint-config-next`
- `eslint-config-prettier`
- `eslint-plugin-import`
- `eslint-plugin-prettier`
- `eslint-plugin-react`
- `eslint-plugin-react-hooks`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `@babel/eslint-parser`
- `prettier`
- `babel-plugin-styled-components` (already replaced by Next.js SWC via
  `compiler.styledComponents: true` in `next.config.mjs`)

### `biome.json` policy

```jsonc
{
  "$schema": "https://biomejs.dev/schemas/2.2.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": {
    "includes": [
      "app/**",
      "components/**",
      "lib/**",
      "styles/**",
      "types/**",
      "**/*.json"
    ]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "javascript": {
    "formatter": {
      "semicolons": "asNeeded",
      "quoteStyle": "double",
      "trailingCommas": "all"
    }
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "assist": {
    "enabled": true,
    "actions": { "source": { "organizeImports": "on" } }
  }
}
```

Notes:

- `semicolons: "asNeeded"` keeps the current Prettier `semi: false` behavior.
- `trailingCommas: "all"` follows Biome's default and matches Prettier 3's
  default. The current Prettier 2.x default of `"es5"` produces fewer trailing
  commas, so the migration produces a one-time formatting diff.
- `organizeImports` replaces the previous `import/order` ESLint rule.
- The `includes` list mirrors the directories already linted via the existing
  `pnpm lint` script.

## Scripts and CI

### `package.json` scripts

```jsonc
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "deploy": "pnpm build",
    "format": "biome format --write .",
    "lint": "biome check --write .",
    "lint:ci": "biome ci .",
    "lint:text": "textlint content/**/index.md",
    "lint:textfix": "textlint --fix content/**/index.md",
    "test": "tsc -p ./tsconfig.json"
  }
}
```

- `lint` is for local use and applies safe fixes automatically.
- `lint:ci` is for CI: it does not modify files and exits non-zero on findings.
- `format` is kept as a separate entry for format-only runs.
- `test`, `lint:text`, `lint:textfix`, and the build scripts are unchanged.

### CI workflow (`.github/workflows/lint.yml`)

Replace `pnpm lint` with `pnpm lint:ci`. All other steps (`actions/checkout`,
`actions/setup-node`, pnpm cache via corepack) stay as they are. `test.yml` is
not modified.

## Migration steps

The migration is performed on a single feature branch and merged in one pull
request.

1. `pnpm add -D -E @biomejs/biome`
2. `pnpm exec biome migrate eslint --include-inspired --write` to seed
   `biome.json` from `.eslintrc.json`.
3. `pnpm exec biome migrate prettier --write` to merge formatter settings from
   `.prettierrc.js`.
4. Reconcile the generated `biome.json` against the policy in
   "`biome.json` policy" above. Add `vcs`, `files.includes`, and the
   `assist.actions.source.organizeImports` block by hand if they were not
   produced by the migrate commands.
5. `pnpm exec biome check --write .` to apply lint fixes, formatting, and
   import sorting in one pass.
6. Manually fix any remaining diagnostics that Biome could not auto-fix. If a
   rule turns out to be excessively noisy on this codebase, downgrade or
   disable it in `biome.json` rather than scattering inline ignores.
7. Delete `.eslintrc.json`, `.eslintrc.js.bak`, and `.prettierrc.js`. Remove
   the dependencies listed in "Dependency changes". Update `package.json`
   scripts.
8. Update `.github/workflows/lint.yml` to use `pnpm lint:ci`.
9. `pnpm install` to refresh `pnpm-lock.yaml`.
10. Run local verification (see "Verification").
11. Open a pull request and note in the description that the diff includes a
    one-time formatting pass.

## Verification

The repository has no unit or integration test suite, so verification relies
on the existing tooling and manual checks.

- `pnpm lint:ci` exits zero with no findings.
- `pnpm test` (tsc) exits zero.
- `pnpm build` succeeds and `git status out/` shows no unexpected changes
  beyond what the formatting pass would produce in source.
- `pnpm dev` serves the site locally; the index page, an article detail page,
  and the profile page render correctly, and dark-mode toggling still works.

## Risks and rollback

- **Risk: noisy rules.** Biome's `recommended` plus inspired rules may flag
  patterns the previous ESLint configuration tolerated. Mitigation: when a
  rule is genuinely not useful here, disable it in `biome.json`; do not
  scatter `// biome-ignore` comments to suppress symptoms.
- **Risk: formatter diff is large.** The trailing-comma change and any other
  Biome-vs-Prettier formatting differences produce a single large mechanical
  diff. Mitigation: keep the diff in one PR, label the commit clearly, and
  review the substantive changes (config, scripts, CI, dependency removals)
  separately from the formatting commit if reviewer load is a concern.
- **Rollback.** Because the migration is delivered as a single PR including
  `pnpm-lock.yaml`, `git revert` of the merge commit fully restores the
  previous toolchain.

## Out of scope follow-ups

- Adopting Biome's `nursery` rules.
- Adding pre-commit hooks via `husky` and `lint-staged`.
- Bumping React, Next.js, or styled-components.
- Replacing styled-components (which is in maintenance mode) with another
  styling approach.
