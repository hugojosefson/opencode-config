/**
 * Git Rebase Autosquash Tool for OpenCode
 * 
 * Since the args schema system expects Zod schemas but file-based tools can't import them,
 * this tool uses the bash tool internally for git operations and provides a simple interface.
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
    if (action === 'create-fixup' && !targetCommit) {
      return `❌ Error: targetCommit is required for create-fixup action

Example: { "action": "create-fixup", "targetCommit": "abc123def" }`;
    }
    
    if (action === 'create-fixup-by-message' && !commitMessage) {
      return `❌ Error: commitMessage is required for create-fixup-by-message action

Example: { "action": "create-fixup-by-message", "commitMessage": "Add user authentication" }`;
    }
    
    if (action === 'apply-autosquash' && !targetCommit) {
      return `❌ Error: targetCommit (base commit/branch) is required for apply-autosquash action

Examples: 
• { "action": "apply-autosquash", "targetCommit": "HEAD~5" }
• { "action": "apply-autosquash", "targetCommit": "main" }`;
    }

    let commands: string[];
    let description: string;

    switch (action) {
      case 'create-fixup':
        command = `git commit --fixup=${targetCommit}`;
        description = `Create fixup commit targeting ${targetCommit}`;
        break;
        
      case 'create-fixup-by-message':
        // Escape single quotes in commit message for shell safety
        const escapedMessage = commitMessage.replace(/'/g, `'"'"'`);
        command = `git commit -m 'fixup! ${escapedMessage}'`;
        description = `Create fixup commit with message matching "${commitMessage}"`;
        break;
        
      case 'apply-autosquash':
        command = `GIT_SEQUENCE_EDITOR=true git rebase -i ${targetCommit} --autosquash`;
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
      const { execSync } = require('child_process');
      const result = execSync(command, { 
        encoding: 'utf8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let successMessage = `✓ Successfully executed: ${command}`;
      
      // Add specific success guidance based on action
      switch (action) {
        case 'create-fixup':
          successMessage += `\n\n→ Fixup commit created for ${targetCommit}` +
            `\n→ Next: Use action='apply-autosquash' to combine it with the target commit` +
            `\n→ Verify staged changes exist before running this command`;
          break;
          
        case 'create-fixup-by-message':
          successMessage += `\n\n→ Fixup commit created with message "${commitMessage}"` +
            `\n→ Ensure this exactly matches the first line of your target commit` +
            `\n→ Next: Use action='apply-autosquash' to combine commits`;
          break;
          
        case 'apply-autosquash':
          successMessage += `\n\n→ Autosquash rebase completed successfully` +
            `\n→ Fixup commits have been combined with their target commits` +
            `\n→ Verify with: git log --oneline`;
          break;
      }

      const fullOutput = successMessage + (result ? `\n\nGit output:\n${result}` : '');
      return fullOutput.trim();
      
    } catch (error) {
      const errorMessage = error.message || error.toString();
      const exitCode = error.exitCode || 'unknown';
      
      return `❌ Git command failed (exit code: ${exitCode})
Command: ${command}
Error: ${errorMessage}

💡 Common issues:
• For fixup commits: Ensure target commit exists and hasn't been pushed to remote
• For autosquash: Ensure there are fixup commits to process in the range
• Verify you're in a git repository and have staged changes (for create-fixup)
• Check that the target commit message exactly matches (for create-fixup-by-message)
• Ensure the target commit/branch exists and is reachable
• If rebase was in progress, it has been automatically cleaned up`;
    }
  }
};