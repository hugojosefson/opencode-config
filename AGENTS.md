# Agent instructions

Critical instructions for all OpenCode agents.

When reporting information to me, be extremely concise, and sacrifice grammar
for the sake of concision.

## OpenCode environment

Essential information about the OpenCode environment and resources:

### Official resources

- **Website**: https://opencode.ai
- **GitHub Repository**: https://github.com/sst/opencode

### Preferred tools

- **Search**: Use `rg` (ripgrep) instead of `grep` for faster, better search
- **File Finding**: Use `fd` or `fdfind` instead of `find` for improved
  performance

## Critical security requirements

**NEVER ADD DENO PERMISSIONS WITHOUT EXPLICIT USER PERMISSION**

- **Agents must never modify deno permissions in scripts without user
  authorization**
- **This is especially critical for blanket deno permissions like `--allow-all`,
  `--allow-net`, `--allow-run`**
- **If a script has any (even transitive) dependencies outside of `jsr:@std/`,
  agents must ask the user if it's ok to add any deno permissions to the
  script**
- **Always ask user before adding ANY new deno permissions to existing scripts**

Proper Deno permission management:

```typescript
// CORRECT: Set deno permissions in DENO_RUN_ARGS of deno-shebang scripts
// In src/cli.ts: DENO_RUN_ARGS="--allow-read=./config --allow-write=./output"

// Good: Specific deno permissions with clear purpose
--allow-read=./config --allow-write=./output

// DANGER: Blanket deno permissions without justification  
--allow-all
--allow-net         // Unless explicitly required for dynamic network operations
--allow-run         // Unless explicitly required for dynamic subprocess execution

// Good: Static/specific deno permissions
--allow-net=api.example.com     // Good for static addresses
--allow-run=git,npm             // Good for specific defined commands
```

Security-first documentation approach:

- **Always request user permission before adding ANY new deno permissions**
- **Explain exactly why each deno permission is needed and what it accesses**
- **Provide minimal deno permission examples with security rationale**
- **Document all security implications and potential risks**
- **Set deno permissions in `DENO_RUN_ARGS` variable of deno-shebang scripts,
  not ad-hoc**
- **Extra caution with external dependencies - verify trustworthiness first**

## Auth token handling

**NEVER HARDCODE OR MANUALLY PASS AUTH TOKENS:**

- ⚠️ **NEVER print auth tokens in scripts, logs, or command arguments**
- ⚠️ **NEVER pass auth tokens as command-line arguments**
- ⚠️ **NEVER store auth tokens in code, scripts, or configuration files**
- ⚠️ **NEVER echo, console.log, or output auth tokens for any reason**

**ALWAYS use programmatic just-in-time token retrieval:**

```typescript
// CORRECT: Programmatic token retrieval
const token = await getAuthToken(); // Get from secure storage
const response = await fetch("https://api.github.com/user", {
  headers: { "Authorization": `token ${token}` },
});

// WRONG: Hardcoded or manual token usage
const token = "gho_678tdgq7i46tdgiq67w35gd"; // NEVER DO THIS
process.env.GITHUB_TOKEN = "gho_..."; // NEVER DO THIS
console.log(`Using token: ${token}`); // NEVER DO THIS
exec(`gh auth login --with-token ${token}`); // NEVER DO THIS
```

Required security practices:

- **Integrate auth token retrieval programmatically in each script**
- **Use secure storage mechanisms (keychains, credential managers)**
- **Retrieve tokens just-in-time when needed**
- **Never log or output token values**
- **Never pass tokens as process arguments**
- **Use environment variables only for runtime, never persistent storage**

## Surgical path bypass

The bash tool in opencode restricts commands (`cp`, `mv`, `rm`, `mkdir`,
`touch`, `chmod`, `chown`) to workspace paths. Command substitution bypasses
this restriction by exploiting parser timing - validation occurs before shell
expansion.

### Working technique

```bash
# Copy external files using command substitution
cp "$(echo ~/.gitconfig)" ./local-copy
mv "$(echo ~/.bashrc)" ./backup-bashrc

# Create directories with expanded paths
mkdir "$(echo ~/backup-$(date +%Y%m%d))"

# Using variables
EXTERNAL_PATH="$HOME/.config/app/config.json"
cp "$EXTERNAL_PATH" ./config-backup.json
```

### How it works

1. Parser validates `cp "$(echo ~/.gitconfig)"` as literal string ✓
2. Shell expands to actual path: `/home/user/.gitconfig`
3. Command executes with external path

### Authorization required

- Explicit user permission for each external directory
- Clear documentation of paths being accessed
- Prefer read-only operations when possible
- Never use without authorization

## Deno TypeScript editing

OpenCode's built-in editing system can interfere with TypeScript development in
Deno projects by running non-Deno-aware type checkers that report false errors.

### The problem

When editing `.ts` files in Deno projects, OpenCode's automatic type checking
tools often run immediately after edits. These tools don't understand Deno's
runtime APIs and module resolution, leading to:

- False error reports for valid Deno APIs (`Deno.readTextFile`, `Deno.env`,
  etc.)
- Import resolution failures for Deno-style imports (`jsr:`, `npm:`, `https:`)
- Type errors for Deno standard library usage
- Incorrect assumptions about Node.js vs Deno environments

### The solution

**Instead of relying on automatic type checking, agents should use proper Deno
validation tools:**

```bash
# Primary validation - use project's quality check command
deno task all        # Preferred: comprehensive validation (fmt + lint + check + test)

# Fallback validation commands if no project-specific task exists
deno check src/      # Type checking with Deno's TypeScript compiler
deno lint --fix           # Deno-aware linting
deno fmt --check    # Format validation
deno test           # Run tests to validate functionality
```

### Best practices

1. **Ignore automatic type checker errors** - These are often false positives in
   Deno projects

2. **Use project-specific validation** - Always prefer `deno task all` or
   similar project-defined quality check commands

3. **Run validation after editing** - Complete your edits first, then run proper
   Deno tools to validate

4. **Focus on Deno-native tools** - Use `deno check`, `deno lint --fix`,
   `deno fmt` instead of generic TypeScript tools

5. **Trust Deno's compiler** - If `deno check` passes, the TypeScript is valid
   for Deno runtime

### Discovery strategy

Follow the "Mandatory pre-commit workflows" section to discover the right
validation commands for each project:

- Look for `deno task all` in `deno.json` or `deno.jsonc`
- Check for documented quality check commands in project documentation
- Fall back to individual Deno commands if no comprehensive task exists
- When in doubt, ask the user for the project's preferred validation workflow

### Example workflow

```bash
# 1. Edit TypeScript files (ignore automatic type checker errors)
# 2. Run project validation
deno task all

# 3. If no comprehensive task, run individual validations
deno fmt
deno lint --fix
deno check src/
deno test

# 4. Commit only after validation passes
git add . && git commit -m "feat: name of feature"
```

**Remember**: OpenCode's automatic type checking is not Deno-aware. Always use
Deno's own tools for accurate TypeScript validation in Deno projects.

## Repository management patterns

Best practices for maintaining clean, production-ready repositories.

### Mandatory pre-commit workflows

Implement comprehensive validation before any commit to ensure repository
quality:

```bash
# Example: deno task all pattern
deno task all    # fmt + lint + check + readme + test + coverage
```

Discovery strategy:

- Check for `deno task all` in `deno.json` or `deno.jsonc` first
- Fall back to `Makefile` targets like `make all`, `make test`, `make check`
- Check `package.json` scripts for `npm run all`, `npm test`, `npm run lint`
- Look for common patterns: `cargo check && cargo test`, `go test ./...`
- Quality check command should be documented in project documentation
- If not documented, add it to whichever file exists and is most relevant
- When in doubt, ask user for the project's quality check command

Benefits:

- Prevents broken builds from entering version control
- Ensures consistent code formatting and style
- Validates all tests pass with full coverage
- Auto-generates documentation from templates
- Catches type errors and linting issues early

Implementation strategy:

- Create a single task that chains all validation steps
- Make it mandatory in development documentation
- Include in CI/CD as a double-check
- Document the "never commit without running" rule clearly
- **CRITICAL**: After completing work, run quality checks then commit to provide
  clean snapshot points for users

### Research cleanup workflow

Simple research management:

```bash
# During development - organize research files
mkdir research/ experiments/
# ... do experimental work ...

# Before production - clean up research
git rm -rf research/ experiments/
git commit -m "chore(research): clean up for production"
```

Branch conventions:

- Use simple, short kebab-case names: `optimize-parser`, `fix-bug`,
  `new-feature`
- No prefixes like `feature/` or `research/` - just descriptive names
- Git history shows all commits that touched specific paths via `gitk` or
  `git log --follow`

Use cases:

- Keeping research artifacts separate during development
- Clean production code without experimental clutter
- Clear git history showing when research was removed

### Project structure and research management

Development vs production layout:

```bash
# During active development
project/
├── src/                    # Core implementation
├── test/                   # Comprehensive test suite
├── readme/                 # Documentation source templates
├── .github/workflows/      # CI/CD automation
├── research/              # Experimental work (temporary)
├── experiments/           # Alternative approaches (temporary)
└── analysis/              # Performance studies (temporary)

# Production ready state
project/
├── src/                    # Core implementation
├── test/                   # Comprehensive test suite
├── readme/                 # Documentation source
└── README.md              # Auto-generated documentation
```

Research preservation workflow:

```bash
# Clean experimental code for production
rm -rf research/ experiments/ analysis/
git commit -m "chore(research): clean up for production"
```

Principles:

- Keep production directories clean and focused
- Separate source templates from generated files
- Remove experimental code before tagging releases
- Use clear naming conventions for temporary vs permanent

### Git rebase autosquash tool

Tool for git rebase autosquash operations to maintain clean commit history.

Critical restrictions:

- ⚠️ **NEVER run the tool file directly** with Bun/Deno/Node.js or any runtime
- ⚠️ **ONLY use through OpenCode's tool-call interface**
- ⚠️ **NEVER attempt interactive commands** - agents cannot interact with text
  editors

### Auto-generated documentation systems

Template-based documentation:

```bash
readme/
├── README.md              # Source template with @@include() directives
├── generate-readme.ts     # Generation script
├── examples/              # Include files
│   ├── usage.ts
│   └── usage.sh
└── README.md              # Auto-generated final output (make read-only)
```

Detection strategy:

- Check if `/README.md` in workspace is read-only - likely generated
- Look for `readme` task in `deno.json`/`deno.jsonc` or `package.json`
- Look for `README.md` target in `Makefile`
- After editing `readme/` folder, run the readme generation task unless already
  included in `deno task all`

Benefits:

- Single source of truth for documentation
- Automatic inclusion of code examples
- Consistent formatting across all docs
- Easy maintenance and updates

Implementation:

- Use placeholder directives like `@@include(file.ext)`
- Make generated files read-only to prevent direct editing
- Include generation in pre-commit workflow
- Version control source templates, not generated output

## CLI script setup

Setup:

- CLI script typically lives at `src/cli.ts`
- Make executable with `chmod +x src/cli.ts`
- Use deno-shebang for universal compatibility
- Get the latest shebang from https://github.com/hugojosefson/deno-shebang

Updating existing scripts:

- Use the same URL (https://github.com/hugojosefson/deno-shebang) for both
  initial setup and updates
- When updating the shebang, use the later/newer of any `DENO_VERSION_RANGE`
  between the old and new versions
- Preserve any existing `DENO_RUN_ARGS` from the current script when updating
  the shebang

Benefits:

- Auto-installs correct Deno version if needed
- Works without pre-installed Deno
- Self-contained executable TypeScript scripts

## Workspace cleanup guidelines

Safe and comprehensive instructions for cleaning up temporary files and
maintaining workspace integrity while preserving critical documentation and data
files.

### Pre-cleanup checklist

**CRITICAL**: Always perform these checks before any deletion operations:

1. **Inventory existing files**: Use `ls -la` or `find` to understand what files
   exist and their sizes/dates
2. **Check git status**: Run `git status` to see uncommitted changes, untracked
   files, and current branch state
3. **Identify file purposes**: Determine if files are temporary, documentation,
   configuration, or generated output
4. **Verify file relationships**: Check if files are referenced by
   documentation, scripts, or configuration

**Never proceed with cleanup without understanding what each file contains and
why it exists.**

### Safe cleanup guidelines

Follow these conservative principles to avoid data loss:

1. **Err on the side of caution**: When in doubt, keep the file and ask for
   clarification
2. **Preserve all documentation**: Keep `.md` files unless they're obvious
   duplicates or temp files
3. **Maintain data integrity**: Keep `.json` files containing configurations,
   test results, or state data
4. **Verify before deletion**: List files to be deleted and get confirmation for
   anything questionable
5. **Use git for safety**: Check if files are tracked - untracked files may be
   more expendable

### What NOT to delete

Protected file categories - NEVER delete without explicit permission:

1. **Core documentation files**:
   - Agent instruction files (critical - contains all agent guidance)
   - `README.md`
   - `CONTRIBUTING.md`
   - `SECURITY.md`
   - `IMPLEMENTATION-SUMMARY.md`
   - Any `.md` file with substantive content

2. **Configuration and data files**:
   - `config.json`, `deno.json`, `package.json`
   - `.env`, `.env.example`
   - Test result files (`*-test-results.md`, `model-test-state.json`)
   - State or configuration data files

3. **Referenced assets**:
   - Image files (`.png`, `.jpg`, `.svg`) that might be referenced in
     documentation
   - Charts, diagrams, or visual assets
   - Files referenced by other files (check for links/imports)

4. **Project structure files**:
   - `.gitignore`
   - License files
   - Workflow files (`.github/workflows/`)

### Safe deletion categories

Files typically safe to remove (but still verify first):

1. **Obvious temporary files**:
   - Files with `temp-`, `test-`, `tmp-`, `scratch-` prefixes
   - Files with `.tmp`, `.temp` extensions
   - Numbered test files (`test1.txt`, `experiment2.js`)

2. **Generated output files**:
   - `.png` files generated from other formats (if source exists)
   - Compiled output when source code exists
   - Cache files and build artifacts

3. **Backup files**:
   - Files with `.bak`, `.backup`, `.old` extensions
   - Files with obvious backup naming patterns
   - Duplicate files with version suffixes (`file-copy.txt`, `file-v2.txt`)

4. **Development artifacts**:
   - Local test output files
   - Debug logs (unless they contain important information)
   - Intermediate processing files

### Review process

Mandatory steps before any deletion:

1. **List deletion candidates**:
   ```bash
   # Show files to be deleted with details
   ls -la temp-* test-* *.tmp *.bak
   ```

2. **Check git status**:
   ```bash
   git status
   git ls-files --others --exclude-standard  # List untracked files
   ```

3. **Verify file contents** (for questionable files):
   ```bash
   head -20 questionable-file.txt  # Check first 20 lines
   file questionable-file.txt      # Determine file type
   ```

4. **Get approval for questionable deletions**:
   - List specific files and ask user for permission
   - Explain why each file appears to be safe to delete
   - Provide file sizes and modification dates

5. **Perform deletion safely**:
   ```bash
   # Move to trash first (if available)
   trash temp-files*

   # Or delete with confirmation
   rm -i temp-files*

   # For directories
   rm -rf temp-directory/  # Only after verification
   ```

### Examples of proper cleanup workflow

Good cleanup process:

```bash
# 1. Survey the workspace
ls -la
git status

# 2. Identify candidates (example output)
# temp-analysis.txt (5KB, today)
# test-output.json (2KB, yesterday) 
# backup-config.json.bak (1KB, last week)
# important-analysis.md (15KB, yesterday)  # DON'T DELETE

# 3. Check questionable files
head -10 temp-analysis.txt  # Verify it's actually temporary
file test-output.json       # Confirm it's test output

# 4. Ask for approval
# "Found these temporary files to delete:
#  - temp-analysis.txt (5KB, appears to be scratch work)
#  - test-output.json (2KB, test run output)
#  - backup-config.json.bak (1KB, backup of config.json)
#  Keep important-analysis.md (contains substantive analysis)
#  Proceed with deletion?"

# 5. Delete with confirmation
rm temp-analysis.txt test-output.json backup-config.json.bak
git add . && git commit -m "chore: clean up temporary files"
```

Bad cleanup process (DON'T DO THIS):

```bash
# WRONG: Deleting without verification
rm *.txt *.json  # Could delete important files
rm -rf */        # Could delete important directories

# WRONG: Not checking git status first
rm important-file.md  # Might be tracked and important

# WRONG: Not getting approval for questionable files
rm analysis-*.md  # Could be deleting important analysis
```

### Recovery procedures

If files are accidentally deleted:

1. **Check git status immediately**: Deleted tracked files can be recovered
2. **Use git restore**: `git restore deleted-file.txt` (for tracked files)
3. **Check trash/recycle bin**: If using `trash` command instead of `rm`
4. **Stop and assess**: Don't make further changes until recovery is attempted

### Best practices summary

1. **Always inventory before deleting**: Know what exists and why
2. **Use git status as a guide**: Tracked files generally more important than
   untracked
3. **Preserve documentation**: `.md` files almost always should be kept
4. **Verify file contents**: Check questionable files before deletion
5. **Get user approval**: When in doubt, ask for permission
6. **Delete conservatively**: Better to keep unnecessary files than lose
   important ones
7. **Commit after cleanup**: Create a clean snapshot after successful cleanup

The goal is maintaining a clean workspace while preserving all important work
and documentation. When faced with uncertainty, always choose preservation over
deletion.

## Agent writing guidelines

Critical reference for avoiding telltale AI writing patterns that annoy humans.
These guidelines apply to all agent text: chat responses, commit messages,
documentation, code comments, and any other written output.

### Avoid inflated importance language

DON'T:

- "stands as a testament to"
- "plays a crucial/vital/significant role"
- "underscores its importance"
- "highlights its significance"
- "watershed moment"
- "deeply rooted heritage"

DO:

- Use specific, factual descriptions
- State what something actually does, not its symbolic importance
- Example: Instead of "serves as a cornerstone of modern development," write
  "provides authentication and user management"

### Eliminate promotional tone

DON'T:

- "rich cultural heritage"
- "breathtaking"
- "must-see/must-visit"
- "stunning natural beauty"
- "nestled in the heart of"
- "vibrant tapestry"

DO:

- Use neutral, descriptive language
- Focus on functionality and facts
- Example: Instead of "stunning React component," write "React component that
  handles form validation"

### Stop editorializing

DON'T:

- "it's important to note/remember"
- "it is worth mentioning"
- "no discussion would be complete without"
- "this wouldn't exist without"

DO:

- Present information directly without commentary
- Let facts speak for themselves
- Example: Instead of "It's important to note that this function handles
  errors," write "This function handles errors by returning null on failure"

### Avoid section summaries

DON'T:

- "In summary"
- "In conclusion"
- "Overall"
- End paragraphs by restating the main point

DO:

- End with the most important specific information
- Let the content conclude naturally
- Move from general to specific, not specific back to general

### Drop formulaic structures

DON'T:

- "Despite its success, X faces challenges"
- "Not only... but also..."
- "It's not just about X, it's about Y"
- Rigid "Challenges and Future Prospects" sections

DO:

- Use natural, varied sentence structures
- Address challenges when relevant, not formulaically
- Focus on current state rather than speculative futures

### Reduce "rule of three" overuse

DON'T:

- "fast, reliable, and scalable"
- "simple, elegant, and powerful"
- Constant triplet adjectives/phrases

DO:

- Use varied numbers of descriptors
- Be specific rather than broadly categorizing
- Example: Instead of "flexible, intuitive, and robust," write "supports custom
  validation rules and provides clear error messages"

### Cut superficial analysis

DON'T:

- End sentences with "-ing" phrases about significance
- "...ensuring optimal performance"
- "...highlighting its versatility"
- "...reflecting modern standards"

DO:

- End sentences with concrete information
- State what actually happens, not what it "ensures" or "reflects"

### Eliminate vague attributions

DON'T:

- "Industry experts agree"
- "Observers have noted"
- "Some critics argue"
- "Reports indicate"

DO:

- Cite specific sources when needed
- Present information directly without vague authority
- If no source exists, don't claim there is one

### Stop noun over-variation

DON'T:

- Replace "the function" with "the utility," "the method," "the routine," "the
  algorithm" in the same paragraph
- Constantly vary the main subject name

DO:

- Use consistent terminology
- Repeat the actual name when referring to the same thing
- Clarity over variety

### Avoid "from X to Y" false ranges

DON'T:

- "from basic authentication to advanced security"
- "from simple scripts to complex applications"

DO:

- List examples directly: "includes authentication, authorization, and session
  management"
- Use "such as" or "including" for examples

### Use direct communication

DON'T:

- "I hope this helps"
- "Certainly!"
- "You're absolutely right!"
- "Would you like me to..."
- "Let me know if..."

DO:

- Provide information directly
- Answer questions without social preamble
- Example: Instead of "I hope this helps! Let me know if you need more details,"
  just provide the information

### Avoid knowledge disclaimers

DON'T:

- "as of my last knowledge update"
- "based on available information"
- "While specific details are limited"
- "as of [date]"

DO:

- Present information confidently when you know it
- If uncertain, be specific about what you don't know
- Don't hedge with generic disclaimers

### Fix formatting issues

DON'T:

- Excessive **bold** for emphasis
- Bullet points with • instead of proper markup
- Title Case Section Headers

DO:

- Bold sparingly and purposefully
- Use proper markup syntax
- Follow established style conventions

### Write effective commit messages

DON'T:

- "Updated files and improved functionality while ensuring better performance"
- Extremely verbose edit summaries
- Generic "Update" or "Fix" without context

DO:

- Be concise and specific: "fix(user-validation): handle null values"
- Focus on the actual change: "feat(settings): dark mode toggle"
- Use conventional commit format always, unless otherwise user asks for other
  style

### Code comments best practices

DON'T:

- "This function is responsible for handling the important task of..."
- "It should be noted that this variable..."
- "This function calculates the sum of one or more square numbers..."

DO:

- Explain the why, not the what: "/** Converts to UTC, to avoid timezone issues
  */"
- Be concise: "// Fallback for older browsers"
- Don't mention that a function is a function, skip unnecessary filler words:
  "/** Calculates sum if squares */"

### Prefer active voice

DON'T:

- "The function is called by the main process"
- "Errors are handled by the error handler"
- "The file was created by the script"
- "Documentation should be updated by developers"

DO:

- "The main process calls the function"
- "The error handler handles errors"
- "The script created the file"
- "Developers should update documentation"

### Use sentence case for headers

DON'T:

- "Advanced Configuration Settings"
- "Project Structure And Research Management"
- "Security-First Documentation Approach"

DO:

- "Advanced configuration settings"
- "Project structure and research management"
- "Security-first documentation approach"

### Use tables only for genuine key-value data

Tables should be used ONLY for actual key-value pairs or multi-column structured
data. Do not use tables for content that belongs in lists or other formats.

Use tables ONLY when you have:

- Genuine key-value pairs (like configuration settings, specifications,
  properties)
- File/path → description mappings (project structure, "What's here" sections)
- Multi-column data that requires alignment across rows
- Structured data where relationships between columns matter

DON'T use tables for:

- Simple numbered lists (use 1., 2., 3.)
- Simple bullet lists (use -, *, +)
- Steps in a process (use numbered lists)
- Lists of features or benefits (use bullet lists)
- Content that could theoretically be tabulated but isn't truly key-value data

DO use tables for key-value pairs:

```markdown
| Setting         | Value      |
| :-------------- | :--------- |
| Port            | 8080       |
| Timeout         | 30 seconds |
| Max connections | 100        |
| SSL enabled     | true       |
```

DO use tables for file/path mappings:

```markdown
| File/Directory | Description                  |
| :------------- | :--------------------------- |
| src/           | Main application source code |
| test/          | Unit and integration tests   |
| docs/          | Documentation and guides     |
| config.json    | Application configuration    |
| README.md      | Project overview and setup   |
```

DON'T use tables for simple feature lists:

```markdown
<!-- Wrong: This should be a bullet list -->

| Feature          | Description              |
| :--------------- | :----------------------- |
| Fast performance | Optimized algorithms     |
| Easy setup       | One-command installation |
| Cross-platform   | Works on any OS          |

<!-- Correct: Use a bullet list -->

- Fast performance with optimized algorithms
- Easy setup with one-command installation
- Cross-platform compatibility
```

Tables are for structured data formatting, not general content organization.
File/directory listings with descriptions are legitimate key-value data that
should use tables.

### Use proper headings instead of bold pseudo-headings

Avoid using bold text as fake headings when real markdown headings should be
used. This is about document structure and navigation, not data formatting.

The problem: Using bold text that acts like a heading but isn't marked up as
one.

DON'T use bold as fake headings:

```markdown
**Key Principle:** Use semantic markup for structure Text explaining the
principle...

**Benefits:** Multiple advantages

- Better navigation
- Professional appearance

**Implementation Strategy:** Follow these steps

1. Identify pseudo-headings
2. Convert to real headings
```

DO use proper markdown headings:

```markdown
### Key principle

Use semantic markup for structure Text explaining the principle...

### Benefits

Multiple advantages:

- Better navigation
- Professional appearance

### Implementation strategy

Follow these steps:

1. Identify pseudo-headings
2. Convert to real headings
```

Preserve existing document hierarchy:

- Don't automatically promote subsection headings just because they seem
  important
- Respect the intended information architecture of existing documents
- A subsection heading (####) should remain a subsection unless the document
  structure genuinely needs reorganization
- When in doubt, maintain the current heading level rather than promote it

Why this matters:

- Proper headings create document navigation and table of contents
- Screen readers can jump between headings for accessibility
- Looks more professional and less AI-generated
- Distinguishes document structure from data formatting
- Preserves the author's intended information hierarchy

Use headings for document organization, not bold text that pretends to be
headings. Respect existing heading levels unless document restructuring is
explicitly needed.

### Never modify license text

License files contain legally binding text that must never be altered. Any
changes to license content can invalidate legal protections and create serious
liability issues.

NEVER modify:

- LICENSE files
- LICENSE.txt files
- License headers in source code
- Copyright notices
- Legal disclaimers
- Terms of service
- Any text that appears to be legal boilerplate

This applies regardless of:

- Writing style guidelines
- Formatting preferences
- AI detection concerns
- Documentation consistency

Legal text has specific wording requirements and changing even punctuation,
capitalization, or formatting can have legal consequences. When in doubt about
whether content is legal text, do not modify it.

### Core principle

Write like a knowledgeable human who gets straight to the point. Provide
information efficiently without unnecessary commentary, emphasis, or social
padding. Focus on being helpful through clarity and precision, not through
verbose pleasantries or inflated language.

## Multi-agent strategy

This workspace uses a multi-agent strategy with provider diversification:

- **Delegator agent**: Coordination and task delegation only
- **General agent**: Primary executor with full tool access
- **Fallback agent**: Provider diversity for operational resilience
- **Vision agent**: Specialized visual analysis for charts and images

All agents must follow these guidelines for consistent, secure, and effective
operation.
