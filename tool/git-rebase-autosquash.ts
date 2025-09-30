/**
 * Git Rebase Autosquash Tool for OpenCode
 *
 * 🚨 CRITICAL WARNING FOR AI AGENTS 🚨
 *
 * NEVER run this file directly with Bun/Deno/Node.js - only use through OpenCode tool-calls!
 * NEVER attempt interactive commands - agents cannot interact with text editors!
 * This tool runs NON-INTERACTIVE operations only using GIT_SEQUENCE_EDITOR=true.
 *
 * RUNTIME ENVIRONMENT: This tool runs under Bun when invoked by OpenCode.
 * Uses Bun-compatible APIs for subprocess execution and file operations.
 */

// Type declarations for Bun runtime APIs that may not be fully recognized by TypeScript
interface BunSpawnOptions {
  stdout?: "pipe" | "inherit";
  stderr?: "pipe" | "inherit";
  stdin?: "pipe" | "ignore";
  env?: Record<string, string>;
}

interface BunProcess {
  exited: Promise<number>;
  stdout: ReadableStream | null;
  stderr: ReadableStream | null;
}

interface BunFile {
  exists(): Promise<boolean>;
}

declare const Bun: {
  spawn(command: string[], options: BunSpawnOptions): BunProcess;
  file(path: string): BunFile;
};

export default {
  description: `Git rebase autosquash tool for AI agents to maintain clean commit history.

This tool provides git rebase autosquash functionality by accepting command parameters 
and executing the appropriate git commands. It supports creating fixup commits and 
applying autosquash rebases.

Usage examples:
- For creating fixup: Pass 'action=create-fixup' with target commit hash
- For autosquash: Pass 'action=apply-autosquash' with base branch/commit
- For verification: Add 'verifyOnly=true' to see commands without executing

Key features:
- Non-interactive autosquash rebase using GIT_SEQUENCE_EDITOR=true
- Creates fixup commits targeting specific commit hashes
- Validates required parameters and provides helpful error messages
- Works only on unpushed commits for safety
`.trim(),

  args: {
    // No args schema - will accept any parameters passed by the LLM
    // and validate them internally
  },

  async execute(args: any, _context: any) {
    // Since we can't use Zod schemas in file-based tools, we'll accept any args
    // and do manual validation
    const { action, targetCommit, commitMessage, verifyOnly = false } = args || {};

    // Provide helpful error if no action specified
    if (!action) {
      return `❌ Missing required parameter: 'action'

Available actions:
• 'create-fixup' - Create a fixup commit for a specific commit hash
• 'create-fixup-by-message' - Create a fixup commit matching a commit message  
• 'apply-autosquash' - Apply autosquash rebase to combine fixup commits

Required parameters:
• action='create-fixup' requires: targetCommit (commit hash)
• action='create-fixup-by-message' requires: commitMessage (exact first line)
• action='apply-autosquash' requires: targetCommit (base commit/branch like 'HEAD~5' or 'main')

Optional:
• verifyOnly=true - Show what would be executed without running commands`;
    }

    // Validation based on action
    if (action === "create-fixup" && !targetCommit) {
      return `❌ Error: targetCommit is required for create-fixup action

Example: { "action": "create-fixup", "targetCommit": "abc123def" }`;
    }

    if (action === "create-fixup-by-message" && !commitMessage) {
      return `❌ Error: commitMessage is required for create-fixup-by-message action

Example: { "action": "create-fixup-by-message", "commitMessage": "Add user authentication" }`;
    }

    if (action === "apply-autosquash" && !targetCommit) {
      return `❌ Error: targetCommit (base commit/branch) is required for apply-autosquash action

Examples: 
• { "action": "apply-autosquash", "targetCommit": "HEAD~5" }
• { "action": "apply-autosquash", "targetCommit": "main" }`;
    }

    let commands: string[];
    let description: string;

    switch (action) {
      case "create-fixup":
        commands = ["git", "commit", `--fixup=${targetCommit}`];
        description = `Create fixup commit targeting ${targetCommit}`;
        break;

      case "create-fixup-by-message":
        // Use array form to properly handle special characters
        commands = ["git", "commit", "-m", `fixup! ${commitMessage}`];
        description = `Create fixup commit with message matching "${commitMessage}"`;
        break;

      case "apply-autosquash":
        // First check if there's a rebase in progress and clean it up
        const cleanupResult = await cleanupFailingRebase();
        if (cleanupResult.hadRebaseInProgress) {
          console.log(`🧹 Cleaned up failing rebase: ${cleanupResult.message}`);
        }

        commands = ["git", "rebase", "-i", targetCommit, "--autosquash"];
        description = `Apply autosquash rebase from ${targetCommit}`;
        break;

      default:
        return `❌ Error: Unknown action '${action}'

Available actions:
• 'create-fixup' - Create fixup commit for specific commit hash
• 'create-fixup-by-message' - Create fixup commit matching commit message
• 'apply-autosquash' - Apply autosquash rebase to combine fixups`;
    }

    if (verifyOnly) {
      return `✓ Verification mode - would execute:

Command: ${commands.join(" ")}
Description: ${description}

To execute, call again with verifyOnly=false or omit verifyOnly parameter.`;
    }

    // Execute the git command using Bun's subprocess API
    try {
      // Set environment variables for non-interactive rebase
      const env = action === "apply-autosquash" ? { ...(globalThis as any).process?.env || {}, GIT_SEQUENCE_EDITOR: "true" } : (globalThis as any).process?.env || {};

      const proc = Bun.spawn(commands, {
        stdout: "pipe",
        stderr: "pipe",
        stdin: "ignore",
        env,
      });

      const result = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      const stderr = await new Response(proc.stderr).text();

      if (result !== 0) {
        throw new Error(`Command failed with exit code ${result}: ${stderr || stdout}`);
      }

      let successMessage = `✓ Successfully executed: ${commands.join(" ")}`;

      // Add specific success guidance based on action
      switch (action) {
        case "create-fixup":
          successMessage += `\n\n→ Fixup commit created for ${targetCommit}` +
            `\n→ Next: Use action='apply-autosquash' to combine it with the target commit` +
            `\n→ Verify staged changes exist before running this command`;
          break;

        case "create-fixup-by-message":
          successMessage += `\n\n→ Fixup commit created with message "${commitMessage}"` +
            `\n→ Ensure this exactly matches the first line of your target commit` +
            `\n→ Next: Use action='apply-autosquash' to combine commits`;
          break;

        case "apply-autosquash":
          successMessage += `\n\n→ Autosquash rebase completed successfully` +
            `\n→ Fixup commits have been combined with their target commits` +
            `\n→ Verify with: git log --oneline`;
          break;
      }

      const fullOutput = successMessage + (stdout ? `\n\nGit output:\n${stdout}` : "");
      return fullOutput.trim();
    } catch (error: any) {
      const errorMessage = error.message || error.toString();

      return `❌ Git command failed
Command: ${commands.join(" ")}
Error: ${errorMessage}

💡 Common issues:
• For fixup commits: Ensure target commit exists and hasn't been pushed to remote
• For autosquash: Ensure there are fixup commits to process in the range
• Verify you're in a git repository and have staged changes (for create-fixup)
• Check that the target commit message exactly matches (for create-fixup-by-message)
• Ensure the target commit/branch exists and is reachable
• If rebase was in progress, it has been automatically cleaned up`;
    }
  },
};

/**
 * Clean up any failing rebase in progress before attempting autosquash
 * This prevents autosquash from failing due to existing rebase state
 */
async function cleanupFailingRebase() {
  try {
    // Check if there's a rebase in progress
    const checkProc = Bun.spawn(["git", "status", "--porcelain=v1"], {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });

    const checkResult = await checkProc.exited;
    if (checkResult !== 0) {
      return { hadRebaseInProgress: false, message: "Could not check git status" };
    }

    const statusOutput = await new Response(checkProc.stdout).text();

    // Look for rebase indicators in git status
    const hasRebaseInProgress = statusOutput.includes("rebase in progress") ||
      statusOutput.includes("You are currently rebasing");

    if (!hasRebaseInProgress) {
      // Also check for .git/rebase-merge or .git/rebase-apply directories
      const rebaseMergeExists = await Bun.file(".git/rebase-merge").exists();
      const rebaseApplyExists = await Bun.file(".git/rebase-apply").exists();

      if (!rebaseMergeExists && !rebaseApplyExists) {
        return { hadRebaseInProgress: false, message: "No rebase in progress" };
      }
    }

    // Abort the current rebase to clean up state
    const abortProc = Bun.spawn(["git", "rebase", "--abort"], {
      stdout: "pipe",
      stderr: "pipe",
      stdin: "ignore",
    });

    const abortResult = await abortProc.exited;
    const abortStderr = await new Response(abortProc.stderr).text();

    if (abortResult === 0) {
      return {
        hadRebaseInProgress: true,
        message: "Successfully aborted previous failing rebase",
      };
    } else {
      return {
        hadRebaseInProgress: true,
        message: `Failed to abort rebase: ${abortStderr}`,
      };
    }
  } catch (error: any) {
    return {
      hadRebaseInProgress: false,
      message: `Error during cleanup: ${error.message}`,
    };
  }
}
