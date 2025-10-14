# GitHub repository automation setup

Commands for configuring GitHub repositories with automated dependency
management and CI/CD workflows.

## Repository settings

### Basic configuration

```bash
gh repo edit --visibility public
gh repo edit --enable-issues
gh repo edit --enable-projects
gh repo edit --disable-wiki
gh repo edit --delete-branch-on-merge
gh repo edit --enable-rebase-merge
gh repo edit --disable-merge-commit
gh repo edit --disable-squash-merge
gh repo edit --enable-auto-merge
gh api repos/OWNER/REPO -X PATCH -f allow_update_branch=true
```

### Branch protection

```bash
gh api repos/OWNER/REPO/branches/main/protection -X PUT --input - <<EOF
{
  "required_status_checks": {
    "strict": false,
    "contexts": [
      "test (3.9)",
      "test (3.10)",
      "test (3.11)",
      "test (3.12)",
      "test (3.13)",
      "test (3.14)",
      "lint (3.14)"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF
```

**Python projects:**

```json
"contexts": ["test (3.9)", "test (3.10)", "test (3.11)", "test (3.12)", "lint"]
```

**Node.js projects:**

```json
"contexts": ["test (18.x)", "test (20.x)", "test (22.x)", "lint"]
```

**Deno projects:**

```json
"contexts": ["test", "lint", "format-check"]
```

**Bun projects:**

```json
"contexts": ["test", "lint", "type-check"]
```

### Repository secrets

Required secrets for automation:

```bash
# Renovate token (for dependency updates)
# Create a personal access token with repo scope
gh secret set RENOVATE_TOKEN

# Docker Hub credentials (if using Docker)
gh secret set DOCKERHUB_USERNAME
gh secret set DOCKERHUB_TOKEN

# Codecov token (if using code coverage)
gh secret set CODECOV_TOKEN
```

## Renovate configuration

### .github/renovate.json

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended"
  ],
  "dependencyDashboard": true,
  "dependencyDashboardTitle": "Dependency Dashboard",
  "schedule": [
    "before 6am on Monday"
  ],
  "rebaseWhen": "behind-base-branch",
  "automergeStrategy": "rebase",
  "pinDigests": true,
  "platformAutomerge": true,
  "prConcurrentLimit": 5,
  "prHourlyLimit": 2,
  "vulnerabilityAlerts": {
    "enabled": true,
    "automerge": true,
    "minimumReleaseAge": null
  },
  "lockFileMaintenance": {
    "enabled": true,
    "schedule": [
      "before 6am on Monday"
    ],
    "automerge": true
  },
  "packageRules": [
    {
      "description": "Python minor/patch updates - automerge stable versions",
      "matchManagers": ["pip_requirements", "pip_setup"],
      "matchDepTypes": ["dependencies"],
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0\\./",
      "automerge": true,
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "Python major updates - require review",
      "matchManagers": ["pip_requirements", "pip_setup"],
      "matchDepTypes": ["dependencies"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "Python pre-1.0 versions - require review",
      "matchManagers": ["pip_requirements", "pip_setup"],
      "matchDepTypes": ["dependencies"],
      "matchCurrentVersion": "/^0\\./",
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "Node.js/npm minor/patch updates - automerge stable versions",
      "matchManagers": ["npm"],
      "matchDepTypes": ["dependencies", "devDependencies"],
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0\\./",
      "automerge": true,
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "Node.js/npm major updates - require review",
      "matchManagers": ["npm"],
      "matchDepTypes": ["dependencies", "devDependencies"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "Deno minor/patch updates - automerge stable versions",
      "matchManagers": ["deno"],
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0\\./",
      "automerge": true,
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "Deno major updates - require review",
      "matchManagers": ["deno"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "Bun updates - automerge minor/patch",
      "matchManagers": ["bun"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true,
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "Dockerfile updates - require review",
      "matchManagers": ["dockerfile"],
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "GitHub Actions minor/patch updates - automerge",
      "matchManagers": ["github-actions"],
      "matchUpdateTypes": ["minor", "patch"],
      "automerge": true
    },
    {
      "description": "GitHub Actions major updates - require review",
      "matchManagers": ["github-actions"],
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "reviewersFromCodeOwners": true
    },
    {
      "description": "PyPI packages - minimum release age",
      "matchDatasources": ["pypi"],
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "npm packages - minimum release age",
      "matchDatasources": ["npm"],
      "minimumReleaseAge": "3 days"
    },
    {
      "description": "Python security updates - immediate automerge",
      "matchDatasources": ["pypi"],
      "matchDepTypes": ["dependencies"],
      "matchUpdateTypes": ["minor", "patch"],
      "matchCurrentVersion": "!/^0\\./",
      "vulnerabilityAlerts": {
        "enabled": true,
        "minimumReleaseAge": null
      }
    }
  ],
  "pip_setup": {
    "fileMatch": ["(^|/)pyproject\\.toml$"]
  }
}
```

### .github/workflows/renovate.yml

```yaml
name: Renovate

on:
  schedule:
    - cron: "0 6 * * 1"
  workflow_dispatch:
  # Trigger when dependency files change
  push:
    branches:
      - main
    paths:
      # Python
      - "pyproject.toml"
      - "requirements*.txt"
      - "setup.py"
      - "setup.cfg"
      - "Pipfile"
      # Node.js
      - "package.json"
      - "package-lock.json"
      - "yarn.lock"
      - "pnpm-lock.yaml"
      # Bun
      - "bun.lockb"
      # Deno
      - "deno.json"
      - "deno.jsonc"
      - "deno.lock"
      - "import_map.json"
      # Docker
      - "Dockerfile"
      - "**/Dockerfile"
      - "docker-compose.yml"
      - "docker-compose.yaml"
      # Renovate config
      - ".github/workflows/*.yml"
      - ".github/renovate.json"

jobs:
  renovate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v5

      - name: Self-hosted Renovate
        uses: renovatebot/github-action@v40.3.2
        with:
          configurationFile: .github/renovate.json
          token: ${{ secrets.RENOVATE_TOKEN }}
        env:
          LOG_LEVEL: info
          RENOVATE_REPOSITORIES: ${{ github.repository }}
```

## CI/CD workflows

### Python: .github/workflows/ci.yml

```yaml
name: CI Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.9", "3.10", "3.11", "3.12", "3.13", "3.14"]

    steps:
      - uses: actions/checkout@v5

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v6
        with:
          python-version: ${{ matrix.python-version }}

      - name: Cache pip dependencies
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-${{ matrix.python-version }}-${{ hashFiles('**/pyproject.toml') }}
          restore-keys: |
            ${{ runner.os }}-pip-${{ matrix.python-version }}-
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Run tests with pytest
        run: |
          pytest tests/ -v --cov=scatter_svg --cov-report=xml --cov-report=term

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v5
        if: matrix.python-version == '3.11'
        with:
          files: ./coverage.xml
          fail_ci_if_error: false
```

### Python: .github/workflows/lint.yml

```yaml
name: Lint and Format

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        python-version: ["3.14"]

    steps:
      - uses: actions/checkout@v5

      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v6
        with:
          python-version: ${{ matrix.python-version }}

      - name: Cache pip dependencies
        uses: actions/cache@v4
        with:
          path: ~/.cache/pip
          key: ${{ runner.os }}-pip-lint-${{ hashFiles('**/pyproject.toml') }}
          restore-keys: |
            ${{ runner.os }}-pip-lint-
            ${{ runner.os }}-pip-

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"

      - name: Check code formatting with black
        run: |
          black --check src/ tests/

      - name: Lint with ruff
        run: |
          ruff check src/ tests/
```

### Node.js: .github/workflows/ci.yml

```yaml
name: CI Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version: [18.x, 20.x, 22.x]

    steps:
      - uses: actions/checkout@v5

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v5
        if: matrix.node-version == '20.x'
        with:
          files: ./coverage/lcov.info
```

### Deno: .github/workflows/ci.yml

```yaml
name: CI Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5

      - name: Setup Deno
        uses: denoland/setup-deno@v2
        with:
          deno-version: v2.x

      - name: Check formatting
        run: deno fmt --check

      - name: Lint
        run: deno lint

      - name: Type check
        run: deno check src/mod.ts

      - name: Run tests
        run: deno test --coverage=coverage

      - name: Generate coverage
        run: deno coverage coverage --lcov > coverage.lcov

      - name: Upload coverage
        uses: codecov/codecov-action@v5
        with:
          files: ./coverage.lcov
```

### Bun: .github/workflows/ci.yml

```yaml
name: CI Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run type check
        run: bun run type-check

      - name: Run lint
        run: bun run lint

      - name: Run tests
        run: bun test --coverage
```

### Docker: .github/workflows/docker.yml

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  docker:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v5

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Run docker tests
        run: |
          make docker-test

      - name: Build and push Docker image
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        run: |
          make docker-build docker-push
```

## Setup checklist

```bash
# 1. Create repository
gh repo create OWNER/REPO --public

# 2. Configure settings
gh repo edit OWNER/REPO --enable-issues --enable-projects --disable-wiki
gh repo edit OWNER/REPO --delete-branch-on-merge
gh repo edit OWNER/REPO --enable-rebase-merge --disable-merge-commit --disable-squash-merge
gh repo edit OWNER/REPO --enable-auto-merge
gh api repos/OWNER/REPO -X PATCH -f allow_update_branch=true

# 3. Set secrets
cd /path/to/repo
gh secret set RENOVATE_TOKEN

# 4. Add Renovate config
# Copy .github/renovate.json and .github/workflows/renovate.yml

# 5. Add CI/CD workflows
# Copy appropriate workflow files from above

# 6. Configure branch protection
gh api repos/OWNER/REPO/branches/main/protection -X PUT --input - <<EOF
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["test", "lint"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": null,
  "restrictions": null
}
EOF
```

## Verification

```bash
# Check settings
gh api repos/OWNER/REPO --jq '{
  allow_auto_merge,
  allow_merge_commit,
  allow_rebase_merge,
  allow_squash_merge,
  allow_update_branch,
  delete_branch_on_merge
}'

# Check branch protection
gh api repos/OWNER/REPO/branches/main/protection --jq '{
  required_status_checks: .required_status_checks.contexts,
  strict: .required_status_checks.strict,
  enforce_admins: .enforce_admins.enabled
}'
```
