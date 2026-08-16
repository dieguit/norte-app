---
name: github-issue-operations
description: Use when creating, reading, labelling, assigning, or wiring GitHub Issues in this repository, especially when `gh issue view` hits the deprecated Projects Classic error or `gh issue edit` lacks dependency flags.
---

# GitHub Issue Operations

Use `gh api` against `dieguit/norte-app`; avoid `gh issue view`, which requests deprecated Projects Classic fields.

## Read

```bash
gh api repos/dieguit/norte-app/issues/<number>
gh api repos/dieguit/norte-app/issues/<number>/comments
```

The response includes the issue database `id`, GraphQL `node_id`, labels, assignees, and dependency summary.

## Create and label

Create with the REST API and an explicit Markdown body. `-F 'labels[]=...'` did not apply labels here.

```bash
gh api --method POST repos/dieguit/norte-app/issues \
  --raw-field title='Title' --raw-field body=$'## What to build\n\n...'
gh issue edit <number> --repo dieguit/norte-app --add-label ready-for-agent
```

## Assign and block

Use GraphQL when REST assignment fails or `gh issue edit` has no `--add-blocked-by` flag. Issue and user `node_id` values come from the read response.

```bash
gh api graphql -f query='mutation($issue: ID!, $assignee: ID!) { addAssigneesToAssignable(input: { assignableId: $issue, assigneeIds: [$assignee] }) { assignable { ... on Issue { assignees(first: 1) { nodes { login } } } } } }' \
  -F issue=<issue-node-id> -F assignee=<user-node-id>

gh api graphql -f query='mutation($issue: ID!, $blocker: ID!) { addBlockedBy(input: { issueId: $issue, blockingIssueId: $blocker }) { issue { number } blockingIssue { number } } }' \
  -F issue=<blocked-issue-node-id> -F blocker=<blocking-issue-node-id>
```

For labels via GraphQL, use the issue `node_id` and label `node_id` returned by an existing labelled issue:

```bash
gh api graphql -f query='mutation($issue: ID!, $label: ID!) { addLabelsToLabelable(input: { labelableId: $issue, labelIds: [$label] }) { labelable { ... on Issue { labels(first: 10) { nodes { name } } } } } }' \
  -F issue=<issue-node-id> -F label=<label-node-id>
```

## Verify

Re-read both issues. Confirm the label lists contain `ready-for-agent`; the blocked issue has `issue_dependencies_summary.blocked_by: 1`; and the dependency mutation response names both issue numbers.

Do not use a body-only `Blocked by` list as a substitute for the native edge.
