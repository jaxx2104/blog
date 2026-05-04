# 2026-05-04: Cosense sync — Phase 3 (operational hardening)

## Context

Phase 2 (merged into `main` on 2026-05-04) enabled the Cosense → blog
sync cron at `*/30 * * * *` and introduced per-page error tolerance:
the orchestrator now writes a `.sync-errors.json` artifact when one or
more pages fail to transform, while the workflow as a whole still
exits zero so that the rest of the run keeps publishing.

The result is that two distinct kinds of breakage now exist in
production with no out-of-band signal to the author:

1. **Workflow-level failure** — the orchestrator throws (Cosense API
   down, schema drift, network glitch). The workflow goes red, but
   relies on GitHub's default email/UI notification, which is easy to
   miss for a half-hourly cron.
2. **Per-page failure** — the workflow exits zero but
   `.sync-errors.json` is non-empty. The artifact is uploaded and the
   `Surface skipped/errored pages` step writes a `GITHUB_STEP_SUMMARY`
   block, but neither is visible without opening the run.

Both states should be surfaced to a place the author already watches:
the repo's GitHub Issues. Phase 3 adds an idempotent post-sync
reporter that maintains a single `sync-broken`-labelled issue
reflecting current sync health, and closes it automatically once a
clean run lands.

## Mental model

| State                          | Detection                                              | Issue action       |
|--------------------------------|--------------------------------------------------------|--------------------|
| **Healthy**                    | sync exit 0 AND `.sync-errors.json` empty/missing      | Close any open     |
| **Workflow crash**             | sync exit non-zero (zod parse, network, unhandled err) | Open or comment    |
| **Partial failure**            | sync exit 0 AND `.sync-errors.json` non-empty          | Open or comment    |

A single open issue with the `sync-broken` label is the source of
truth for "is sync currently broken". The reporter is idempotent on
that signal: if an open issue already exists, the reporter comments
on it instead of creating a duplicate; if none exists in a healthy
state, it is a no-op.

## Goals

1. The author learns that sync is broken without having to inspect
   workflow runs. A red issue with the latest run URL appears in the
   repo's issues view within one cron tick of the failure.
2. The author learns that sync has recovered without manual triage.
   On the first clean run after a failure, the open `sync-broken`
   issue is closed with a recovery comment linking to the green run.
3. Per-page errors and workflow crashes are reported through the same
   surface; the issue body discloses which kind it is.
4. The reporter is fully testable: subprocess calls to `gh` are
   wrapped behind an injectable interface so unit tests verify the
   decision logic without hitting the network or the GitHub API.
5. No new infrastructure is introduced. The reporter runs as a
   workflow step using the ambient `GITHUB_TOKEN` and the `gh` CLI
   pre-installed on `ubuntu-latest`.

## Non-goals

1. **Slack / email / external notifications.** The author monitors
   the repo's issues view daily; GitHub Issues is sufficient and
   keeps the failure surface inside the repo.
2. **Retry logic.** A failed sync run is retried by the next cron
   tick (30 minutes later). Adding retries inside a single run would
   complicate the failure semantics this spec relies on.
3. **Metrics, dashboards, structured telemetry.** Out of scope; would
   require infrastructure the blog does not have.
4. **Schema drift as a separate detection path.** The Cosense client
   already validates API responses with zod; a schema change becomes a
   workflow crash and is therefore covered by case 2 of the mental
   model.
5. **Touching `lib/sync/**` or `scripts/sync-cosense.ts`.** Phase 3 is
   purely additive and reads sync output, not internals.
6. **Bidirectional sync (blog → Cosense)** and **backfilling
   blog-only posts to Cosense**. Both remain out of scope as in
   Phase 2.

## Inputs and outputs

The reporter is a TypeScript script invoked from the sync workflow
after the sync step. Its inputs and outputs are:

**Inputs (env):**
- `SYNC_STATUS` — `success` or `failure`. Sourced from
  `${{ steps.sync.outcome }}` in the workflow YAML.
- `WORKFLOW_RUN_URL` — full URL to the current workflow run. Sourced
  from `${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}`.
- `GH_TOKEN` — ambient `secrets.GITHUB_TOKEN`, used by the `gh` CLI.

**Inputs (filesystem):**
- `.sync-errors.json` at the repo root. Optional; missing or empty
  is treated as "no per-page errors".

**Outputs:**
- Side effects on a single GitHub Issue per repo, identified by the
  `sync-broken` label. The reporter creates, comments on, or closes
  that issue.
- Exit status: `0` on success, `1` on any unexpected error from `gh`
  (so a broken reporter does not silently swallow failures).

## Architecture

```
[cron] ──► [sync-cosense.ts]  ──► .sync-plan.json
                   │                .sync-errors.json
                   │                exit 0 | exit 1
                   ▼
          [sync-report-health.ts]  ──► gh CLI ──► Issue (sync-broken)
            (always runs after sync,
             reads $SYNC_STATUS + errors file)
```

The reporter is split into two layers for testability:

1. **Pure decision function** — `decideAction(status, errors, existing)`
   returns one of `"noop" | "create" | "comment-broken" |
   "comment-recovered-and-close"`. No I/O.
2. **I/O shell** — invokes `gh issue list` to find existing issues,
   calls the decision function, then dispatches to `gh issue create`
   / `gh issue comment` / `gh issue close` accordingly. The `gh`
   wrapper is an injected interface (a single `runGh(args, stdin?) =>
   Promise<string>` function) so tests can stub it.

## Decision matrix

| `SYNC_STATUS` | `errors.length` | existing open issue? | action                         |
|---------------|-----------------|----------------------|--------------------------------|
| success       | 0               | no                   | `noop`                         |
| success       | 0               | yes                  | `comment-recovered-and-close`  |
| success       | > 0             | no                   | `create`                       |
| success       | > 0             | yes                  | `comment-broken`               |
| failure       | 0               | no                   | `create`                       |
| failure       | 0               | yes                  | `comment-broken`               |
| failure       | > 0             | no                   | `create`                       |
| failure       | > 0             | yes                  | `comment-broken`               |

Effectively: the issue is open iff the run is unhealthy. The boundary
between "create" and "comment-broken" is purely whether the issue
already exists.

## Issue body format

**On `create` (new issue):**

```markdown
Sync from Cosense is currently failing.

- Run: <WORKFLOW_RUN_URL>
- Status: <workflow-crash|partial-failure|both>
- Per-page errors: <N>

<details>
<summary>Per-page errors (top 20 of N)</summary>

- <title 1> — <error 1>
- <title 2> — <error 2>
...
</details>

This issue is managed automatically by `scripts/sync-report-health.ts`
and will close itself on the next clean run.
```

**On `comment-broken` (existing issue):**

```markdown
Still failing as of <WORKFLOW_RUN_URL>.

- Status: <workflow-crash|partial-failure|both>
- Per-page errors: <N>

<details>
<summary>Per-page errors (top 20 of N)</summary>
...
</details>
```

**On `comment-recovered-and-close`:**

```markdown
Recovered at <WORKFLOW_RUN_URL>. Closing.
```

Followed by `gh issue close <num>`.

The `<workflow-crash|partial-failure|both>` token is derived as:

- `workflow-crash` — `SYNC_STATUS == "failure"` and errors empty
- `partial-failure` — `SYNC_STATUS == "success"` and errors non-empty
- `both` — `SYNC_STATUS == "failure"` and errors non-empty

## Issue body length cap

GitHub's per-issue-body limit is 65,536 characters. The reporter
caps the per-page error list at the first 20 entries with a
`... and N more` footer. Workflow crash output is not currently
available to the reporter (the orchestrator does not persist its
crash trace), so the body relies on the run URL for the full log.
This is an explicit trade-off — wiring the crash trace into a file
would touch `scripts/sync-cosense.ts`, which Phase 3 deliberately
leaves untouched.

## Workflow YAML changes

The `Run sync` step gains `id: sync` and `continue-on-error: true`,
so the post-sync reporter always runs. After the existing
`Commit & push`, `Surface skipped/errored pages`, and
`Upload sync artifacts` steps, two new steps are added:

```yaml
- name: Report sync health
  if: ${{ always() && !inputs.dry_run }}
  env:
    SYNC_STATUS: ${{ steps.sync.outcome }}
    WORKFLOW_RUN_URL: ${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: pnpm sync:report-health

- name: Fail job if sync failed
  if: ${{ steps.sync.outcome == 'failure' }}
  run: exit 1
```

The final `Fail job if sync failed` step is required because
`continue-on-error: true` masks the sync's actual exit status from
the job-level result. Without it, every workflow run would appear
green even when sync crashed.

The reporter is skipped on `workflow_dispatch` runs with
`dry_run: true`, since dry-run does not write or commit and never
represents a real failure state.

The `sync` job needs `permissions: issues: write` in addition to the
existing `contents: write` for the reporter to call the Issues API
via `gh`.

## Label bootstrap

The `sync-broken` label must exist in the repo before the first
post-sync run. The Phase 3 implementation plan includes a one-time
manual step:

```sh
gh label create sync-broken \
  --color B60205 \
  --description "Cosense sync workflow is currently failing"
```

This is intentionally manual — adding `gh label create --force` to
the workflow would burn an API call on every run for a one-time
bootstrap. The plan documents this as a precondition.

## Error handling and edge cases

| Case                                   | Behavior                                                                            |
|----------------------------------------|-------------------------------------------------------------------------------------|
| `.sync-errors.json` missing            | Treated as `[]`. No per-page errors.                                                |
| `.sync-errors.json` malformed JSON     | Reporter exits 1 with a clear error; the next cron tick re-attempts.                |
| `gh` CLI unauthenticated               | Reporter exits 1; workflow goes red; next cron tick re-attempts.                    |
| `gh` CLI rate-limited                  | Same as above. Rate limits at the per-30-min cadence are not expected for one repo. |
| `sync-broken` label absent             | First `gh issue create` fails. Bootstrap step in the plan prevents this.            |
| Two cron runs racing                   | Cron is `*/30 * * * *` so concurrent runs are not expected; if they happen, both find the same open issue and both append a comment. Idempotent in effect. |
| Issue body exceeds 65,536 chars        | Capped at top 20 per-page errors plus a count footer.                               |
| Multiple open `sync-broken` issues     | Reporter targets `--limit 1`. Manual cleanup is the author's responsibility.        |

## Files

**New:**
- `scripts/sync-report-health.ts`
- `scripts/sync-report-health.test.ts`

**Modified:**
- `.github/workflows/sync.yml` — `id: sync`,
  `continue-on-error: true`, `permissions: issues: write`, two new
  post-sync steps.
- `package.json` — `"sync:report-health": "tsx scripts/sync-report-health.ts"`.

**Untouched:**
- `lib/sync/**`
- `scripts/sync-cosense.ts`
- `scripts/sync-cosense.test.ts`
- `content/posts/**`
- `app/`, `components/`, `styles/`, `velite.config.ts`, etc.

## Testing strategy

**Unit tests for `decideAction`** — pure function, every row of the
decision matrix above. Covers the eight `(status, errors, existing)`
combinations.

**Integration test for the I/O shell** — one end-to-end test per
non-noop branch (`create`, `comment-broken`,
`comment-recovered-and-close`) using a stubbed `runGh` that records
the args/stdin it was called with. Asserts that the right `gh`
subcommand is invoked with the right body.

**No automated test for the workflow YAML.** The plan includes a
manual smoke test (trigger `workflow_dispatch` with a deliberately
wrong `COSENSE_PROJECT` to provoke a crash, observe the issue
opening; restore secrets, observe the issue closing).

## Rollout

1. Land the implementation plan on `feat/cosense-sync-phase-3`.
2. Run `gh label create sync-broken ...` once on the repo.
3. Merge the PR. The next scheduled cron tick exercises the new
   path against real Cosense.
4. Optionally trigger `workflow_dispatch` immediately after merge
   with default inputs to verify the green path runs cleanly.
5. Optional smoke test: temporarily flip `COSENSE_SID` to an invalid
   value via repo secrets, run `workflow_dispatch`, observe the issue
   open. Restore the secret, run again, observe the issue close.

## Open questions resolved during brainstorming

- **Scope of "operational hardening":** narrowed to the issue
  reporter only. Local dry-run UX is already shipped in Phase 2 and
  needs no additional work.
- **Notification channel:** GitHub Issue with auto-open / auto-close
  on a single labelled issue. Other channels rejected as out of
  scope.
- **Schema drift:** treated as a workflow crash; no separate
  detector needed because the zod schemas in `cosense-client.ts`
  already raise on shape changes.
