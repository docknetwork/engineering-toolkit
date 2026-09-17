# Managing Semgrep findings

Handle Semgrep findings in the pull request where they appear.

## Choose the right outcome

- **Fix it** when the finding is valid.
- **False positive** only when Semgrep has misunderstood the code.
- **Acceptable risk** when the finding is valid but the risk is deliberately accepted.

For GitHub PR comments, reply to the Semgrep bot with:

```text
/fp <why Semgrep is wrong here>
/ar <why the risk is accepted; include a tracking issue>
/open
```

Avoid `/other` as it leaves little useful audit context.

Alternatively, in the Semgrep platform, filter **Findings** to your PR or branch, select the
finding, and use **Triage** to set the same status and explanation.

## Guardrails

- Always give a specific and sensible reason. For instance, a generic "Not exploitable" is not
enough without saying what prevents exploitation.
- Do not disable rules, add broad path exclusions, or change policies to resolve
  one false positive.
- Try to avoid the use of `nosemgrep` for code-local suppression.

## References

- [Semgrep Platform Org Link](https://semgrep.dev/orgs/dock_labs)
- [Semgrep's finding triage documentation](https://semgrep.dev/docs/for-developers/resolve-findings-through-app)
