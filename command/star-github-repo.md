---
description: star a GitHub repo
---

Star the GitHub repository specified in the arguments using the gh API.

$ARGUMENTS

Use this command format (the `gh repo star` subcommand doesn't exist, so use the
API directly):

```bash
gh api -X PUT /user/starred/{owner}/{repo}
```

A successful star returns HTTP 204 No Content (empty response with no error).

If the repo is not found (404), verify the owner/repo name is correct.
