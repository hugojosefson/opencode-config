#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^2.5.2";DENO_RUN_ARGS="--allow-net --allow-run=gh";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v "$1" 2>&1)" ];};n(){ [ "$(id -u)" != 0 ];};g(){ if n && ! h;then return;fi;u="$(n&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g "$1")";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};w(){ [ -n "$1" ] && "$1" -V >/dev/null 2>&1;};U="$(l=$(printf "%s" "$V"|wc -c);for i in $(seq 1 $l);do c=$(printf "%s" "$V"|cut -c $i);printf '%%%02X' "'$c";done)";D="$(w "$(command -v deno||:)"||:)";t(){ i="$(if h findmnt;then findmnt -Ononoexec,noro -ttmpfs -nboAVAIL,TARGET|sort -rn|while IFS=$'\n\t ' read -r a m;do [ "$a" -ge 150000000 ]&&[ -d "$m" ]&&printf %s "$m"&&break||:;done;fi)";printf %s "${i:-"${TMPDIR:-/tmp}"}";};s(){ deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";s&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";ln -sf "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v"|grep -iv discord>&2);};e;exec deno run $A "$0" "$@"

/**
 * GitHub Models API CLI tool
 *
 * Fetches GitHub Copilot/Models API model IDs for use in config.json files.
 * Authenticates using gh CLI token and provides multiple output formats.
 */

interface GitHubModel {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  model_family?: string;
  tasks?: string[];
}

interface CliOptions {
  idsOnly: boolean;
  publisher?: string;
  json: boolean;
  help: boolean;
  accessibleOnly: boolean;
}

/** Parse command line arguments */
function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    idsOnly: false,
    json: false,
    help: false,
    accessibleOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--ids-only":
        options.idsOnly = true;
        break;
      case "--publisher":
        if (i + 1 >= args.length) {
          console.error("Error: --publisher requires a value");
          Deno.exit(1);
        }
        options.publisher = args[++i];
        break;
      case "--json":
        options.json = true;
        break;
      case "--accessible-only":
        options.accessibleOnly = true;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        console.error(`Error: Unknown option '${arg}'`);
        Deno.exit(1);
    }
  }

  return options;
}

/** Show usage help */
function showHelp(): void {
  console.log(`GitHub Models API CLI Tool

Fetches GitHub Copilot/Models API model IDs for use in config.json files.

USAGE:
  ./src/github-models.ts [OPTIONS]

OPTIONS:
  --ids-only             Output only model IDs (for direct config use)
  --publisher <name>     Filter by publisher (openai, meta, microsoft, etc.)
  --accessible-only      Show only models you have access to (tests via inference)
  --json                 Output raw JSON response
  --help, -h             Show this help message

EXAMPLES:
  ./src/github-models.ts --ids-only
  ./src/github-models.ts --publisher openai
  ./src/github-models.ts --accessible-only --ids-only
  ./src/github-models.ts --json | jq '.models[].id'
  ./src/github-models.ts --publisher meta --accessible-only

AUTHENTICATION:
  Requires gh CLI authentication. Run 'gh auth login' if not authenticated.
`);
}

/** Get GitHub auth token from gh CLI */
async function getGhToken(): Promise<string> {
  try {
    const cmd = new Deno.Command("gh", {
      args: ["auth", "token"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await cmd.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      if (
        errorText.includes("not logged in") ||
        errorText.includes("authentication")
      ) {
        console.error(
          "Error: Not authenticated with GitHub CLI. Run 'gh auth login' first.",
        );
      } else {
        console.error("Error: Failed to get GitHub CLI token:", errorText);
      }
      Deno.exit(1);
    }

    return new TextDecoder().decode(stdout).trim();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.error(
        "Error: GitHub CLI (gh) not found. Please install it first:",
      );
      console.error("  https://cli.github.com/");
    } else {
      console.error(
        "Error: Failed to execute gh CLI:",
        error instanceof Error ? error.message : String(error),
      );
    }
    Deno.exit(1);
  }
}

/** Fetch models from GitHub Models API */
async function fetchModels(token: string): Promise<GitHubModel[]> {
  try {
    const response = await fetch("https://models.github.ai/catalog/models", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json",
        "User-Agent": "github-models-cli/1.0.0",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        console.error(
          "Error: Authentication failed. Your GitHub CLI token may be invalid or expired.",
        );
        console.error(
          "Try running 'gh auth refresh' or 'gh auth login' again.",
        );
      } else if (response.status === 403) {
        console.error(
          "Error: Access forbidden. You may not have access to GitHub Models API.",
        );
      } else {
        console.error(
          `Error: API request failed with status ${response.status}: ${response.statusText}`,
        );
      }
      Deno.exit(1);
    }

    const data = await response.json();
    return data as GitHubModel[];
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error(
        "Error: Network request failed. Check your internet connection.",
      );
    } else {
      console.error(
        "Error: Failed to fetch models:",
        error instanceof Error ? error.message : String(error),
      );
    }
    Deno.exit(1);
  }
}

/** Filter models by publisher */
function filterByPublisher(
  models: GitHubModel[],
  publisher: string,
): GitHubModel[] {
  const normalizedPublisher = publisher.toLowerCase();
  return models.filter((model) =>
    model.publisher.toLowerCase().includes(normalizedPublisher)
  );
}

/** Test if a model is accessible via inference API */
async function testModelAccess(
  model: GitHubModel,
  token: string,
): Promise<boolean> {
  try {
    // Special handling for o1 models that require max_completion_tokens
    const isO1Model = model.id.includes("/o1");
    const requestBody = {
      model: model.id,
      messages: [{ role: "user", content: "test" }],
      ...(isO1Model ? { max_completion_tokens: 1 } : { max_tokens: 1 }),
    };

    const response = await fetch(
      "https://models.github.ai/inference/chat/completions",
      {
        method: "POST",
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    // If we get a successful response, the model is accessible
    if (response.ok) {
      return true;
    }

    // Check for "Unknown model" error which indicates no access
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || "";

    // "Unknown model" means user doesn't have access to this model
    if (errorMessage.toLowerCase().includes("unknown model")) {
      return false;
    }

    // Other errors (rate limits, etc.) - assume accessible but failed for other reasons
    return true;
  } catch {
    // Network errors - assume accessible but failed to test
    return true;
  }
}

/** Filter models to only those accessible by the user */
async function filterAccessibleModels(
  models: GitHubModel[],
  token: string,
): Promise<GitHubModel[]> {
  console.error("Testing model accessibility... (this may take a moment)");

  const accessibleModels: GitHubModel[] = [];
  const batchSize = 5; // Process in batches to avoid rate limits

  for (let i = 0; i < models.length; i += batchSize) {
    const batch = models.slice(i, i + batchSize);

    // Test batch in parallel with a small delay
    const batchPromises = batch.map(async (model, index) => {
      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, index * 100));

      const isAccessible = await testModelAccess(model, token);
      if (isAccessible) {
        accessibleModels.push(model);
      }

      // Progress indicator
      const progress = Math.floor(((i + index + 1) / models.length) * 100);
      Deno.stderr.write(new TextEncoder().encode(`\rTesting... ${progress}%`));
    });

    await Promise.all(batchPromises);

    // Brief pause between batches
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.error("\rModel accessibility testing complete.   ");
  return accessibleModels;
}

/** Format and output models based on options */
function outputModels(models: GitHubModel[], options: CliOptions): void {
  if (options.idsOnly) {
    // Output just model IDs
    models.forEach((model) => console.log(model.id));
  } else {
    // Output formatted list with names and publishers
    models.forEach((model) => {
      console.log(`${model.id} - ${model.name} (${model.publisher})`);
    });
  }
}

/** Main function */
async function main(): Promise<void> {
  const args = Deno.args;
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  // Get GitHub auth token
  const token = await getGhToken();

  // Fetch models from API
  const models = await fetchModels(token);

  if (options.json) {
    // For JSON output with accessible-only, we need to filter first
    let outputModels = models;

    if (options.accessibleOnly) {
      outputModels = await filterAccessibleModels(models, token);
    }

    if (options.publisher) {
      outputModels = filterByPublisher(outputModels, options.publisher);
    }

    console.log(JSON.stringify(outputModels, null, 2));
    return;
  }

  let filteredModels = models;

  // Filter by accessibility if requested (do this first as it's most expensive)
  if (options.accessibleOnly) {
    filteredModels = await filterAccessibleModels(filteredModels, token);

    if (filteredModels.length === 0) {
      console.error("No accessible models found for your account.");
      console.error("Check your GitHub Copilot license and try again.");
      Deno.exit(1);
    }
  }

  // Filter by publisher if specified
  if (options.publisher) {
    filteredModels = filterByPublisher(filteredModels, options.publisher);

    if (filteredModels.length === 0) {
      console.error(`No models found for publisher: ${options.publisher}`);
      console.error("Available publishers:");
      const publishers = [
        ...new Set(models.map((m: GitHubModel) => m.publisher)),
      ].sort();
      publishers.forEach((pub) => console.error(`  ${pub}`));
      Deno.exit(1);
    }
  }

  // Sort models by ID for consistent output
  filteredModels.sort((a: GitHubModel, b: GitHubModel) =>
    a.id.localeCompare(b.id)
  );

  // Output models
  outputModels(filteredModels, options);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Unexpected error:", error.message);
    Deno.exit(1);
  });
}
