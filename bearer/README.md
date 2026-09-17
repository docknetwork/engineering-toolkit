# Bearer CLI

Caller templates and support scripts for the reusable Bearer-CLI workflows in
[/.github/workflows](../.github/workflows).

| Reusable workflow | Trigger | Scope |
| --- | --- | --- |
| `bearer-diff.yml` | Pull request | Findings introduced by the pull request |
| `bearer-full.yml` | Manual dispatch | Whole repository at the selected ref |

Both run the `sast` and `secrets` scanners.

## Contents

| Path | Purpose |
| --- | --- |
| `templates/.github/workflows/bearer-pr.yml` | Pull-request caller |
| `templates/.github/workflows/bearer-full.yml` | Manual full-scan caller |
| `templates/.bearer/bearer.yml` | Required; rule and path exclusions |
| `templates/.bearer/bearer.ignore` | Required; fingerprint-based exclusions |
| `scripts/` | Internal report rendering used by the reusable workflows |

## Setup

1. Copy `templates/.github/workflows/` into the target repository's
   `.github/workflows/`.
2. Copy `templates/.bearer/` to the repository root. Both files are required
   even when empty; the scan fails without them.
3. Optionally set the [repository variables below](#repository-variables).

## Repository variables

Both apply to the pull-request caller only; the full scan takes its severity
from the dispatch form.

| Variable | Default | Effect |
| --- | --- | --- |
| `BEARER_MIN_SEVERITY` | `high` | Lowest severity reported: `critical`, `high`, `medium`, `low`, or `all`. |
| `BEARER_ENFORCE` | unset | `true` reports findings as errors and fails the scan job. |

`BEARER_ENFORCE` changes finding annotations from warnings to errors and fails
the scan job. 

## Results

Pull requests get annotations on the scan job, each carrying the severity, rule
ID, fingerprint, and documentation link. Note that GitHub limits native
annotations to 10 warnings or errors per step. However, the complete findings table
is always written to the job summary.

The full scan writes its findings table to the run summary and repeats the list
in the job log.

## Configuration

All Bearer-CLI configuration must live in `.bearer/` at the target repository root.

A pull request that touches `.bearer/` gets a non-blocking warning annotation
on each changed file and the full diff in the job summary. Review those changes:
they decide what the scan sees.

## Suppress a finding

Take the fingerprint and run:

```shell
bearer ignore add <fingerprint> \
  --ignore-file=.bearer/bearer.ignore \
  --author="Developer Name" \
  --comment="Why this finding is accepted" \
  --false-positive
```

Omit `--false-positive` for accepted risk. The pull request will carry the
configuration-change warning(s).
