---
name: fix-issue
description: This skill should be used when the user asks to "fix an issue", "work on an issue", "pick up an issue", or wants to automate the GitHub issue lifecycle from selection through PR merge.
disable-model-invocation: true
---

# Fix Issue Workflow

Follow these steps in order. Do not skip steps.

## Step 1: Pull latest

Run `git checkout main && git pull` to ensure the local repo is up to date.

## Step 2: Find unassigned issues

Run `gh issue list --state open --json number,title,body,labels,assignees --jq '[.[] | select(.assignees | length == 0) | select((.labels | map(.name)) - ["backlog","wontfix","duplicate","invalid"] == (.labels | map(.name)))]'` to get all unassigned, actionable open issues.

If there are no unassigned issues, tell the user and stop.

## Step 3: Present top issues to the user

Analyze the list of issues. Filter out any that depend on other open issues (look for "dependent on", "depends on", "blocked by" in the body). From the remaining issues, select up to 4 candidates ranked by simplicity:
- Clarity of requirements in the title/body
- Likely number of files and lines to change
- Low risk of side effects

Present the candidates to the user with a brief summary of each and recommend the easiest one. Use AskUserQuestion to let the user pick which issue to work on.

## Step 4: Assign the issue AS SOON as the user selects an option (before writing the plan)

Run `gh issue edit <N> --add-assignee @me` to assign the chosen issue to the current user.

## Step 5: Create a feature branch

Run `git checkout -b fix/issue-<N>-<short-kebab-description>` from main.

## Step 6: Plan the fix

Read the relevant source files and understand the codebase context. Build a concrete plan for the fix — which files to change, what to add/modify/remove.

Present the plan to the user and ask for confirmation before proceeding. Do NOT start coding until the user approves. Use the AskUserQuestion tool to confirm.

## Step 7: Implement the fix

Make the code changes according to the approved plan. Follow project conventions from CLAUDE.md (TypeScript strict, Tailwind, kebab-case files, functional components).

## Step 8: Validate with Chrome DevTools

Use Chrome DevTools MCP to verify the fix:
1. Navigate to the running app (typically `http://localhost:5173`)
2. Take a screenshot to visually confirm the fix
3. Check console messages for errors via `list_console_messages`
4. If the fix is visual, take before/after screenshots to show the user

If validation reveals problems, fix them and re-validate.

## Step 9: Commit

Stage all changes and commit with a short, descriptive message. Reference the issue: `Fixes #<N>`. Do NOT mention Claude or AI in the commit message.

## Step 10: Push and create PR

Run `git push -u origin <branch-name>` to push the branch.

Then create a PR: `gh pr create --title "<descriptive title>" --body "Fixes #<N>" --base main`

## Step 11: Merge the PR

Run `gh pr merge --squash --delete-branch` to squash-merge and clean up the remote branch.

## Step 12: Clean up

Run `git checkout main && git pull` to return to main with the merged changes.

Delete the local branch if it still exists: `git branch -D <branch-name>`

Tell the user the issue is fixed, merged, and closed. Include the PR URL.
