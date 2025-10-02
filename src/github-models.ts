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
Discovers models from both GitHub Models catalog AND GitHub Copilot endpoints.

USAGE:
  ./src/github-models.ts [OPTIONS]

OPTIONS:
  --ids-only             Output only model IDs (for direct config use)
  --publisher <name>     Filter by publisher (openai, meta, microsoft, anthropic, etc.)
  --accessible-only      Show only models you have access to (tests via inference)
  --json                 Output raw JSON response
  --help, -h             Show this help message

EXAMPLES:
  ./src/github-models.ts --ids-only
  ./src/github-models.ts --publisher anthropic
  ./src/github-models.ts --accessible-only --ids-only
  ./src/github-models.ts --json | jq '.models[].id'
  ./src/github-models.ts --publisher meta --accessible-only

AUTHENTICATION:
  Requires gh CLI authentication. Run 'gh auth login' if not authenticated.

MODEL DISCOVERY:
  This tool discovers models from multiple sources:
  - GitHub Models catalog (https://models.github.ai/catalog/models)
  - GitHub Copilot endpoints (including Claude models not in catalog)
  
  Claude models like 'claude-sonnet-4' are only available via Copilot endpoints.
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

/** Fetch models from GitHub Models catalog API */
async function fetchCatalogModels(token: string): Promise<GitHubModel[]> {
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
        "Error: Failed to fetch catalog models:",
        error instanceof Error ? error.message : String(error),
      );
    }
    Deno.exit(1);
  }
}

/** Fetch models from GitHub Copilot API */
async function fetchCopilotModels(token: string): Promise<GitHubModel[]> {
  const copilotEndpoints = [
    "https://api.githubcopilot.com/models",
    "https://copilot-proxy.githubusercontent.com/models",
  ];

  for (const endpoint of copilotEndpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
          "User-Agent": "github-models-cli/1.0.0",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          console.error(
            `✅ Found ${data.data.length} models from Copilot endpoint: ${endpoint}`,
          );
          // Convert Copilot model format to our GitHubModel format
          return data.data.map((model: Record<string, unknown>) => ({
            id: model.id as string,
            name: (model.name as string) || (model.id as string),
            publisher: (model.vendor as string) || "Unknown",
            description: ((model.capabilities as Record<string, unknown>)
              ?.type as string) || "",
            model_family: ((model.capabilities as Record<string, unknown>)
              ?.family as string) || "",
            tasks: (model.capabilities as Record<string, unknown>)?.supports
              ? Object.keys(
                (model.capabilities as Record<string, unknown>)
                  .supports as Record<string, unknown>,
              )
              : [],
          }));
        }
      }
    } catch (error) {
      // Continue to next endpoint if this one fails
      console.error(
        `Warning: Failed to fetch from ${endpoint}:`,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // If all Copilot endpoints fail, return empty array (not an error)
  console.error(
    "Warning: Could not fetch models from GitHub Copilot endpoints. You may not have Copilot access.",
  );
  return [];
}

/** Fetch all models from both catalog and Copilot APIs */
async function fetchAllModels(token: string): Promise<GitHubModel[]> {
  console.error("Fetching models from GitHub Models catalog...");
  const catalogModels = await fetchCatalogModels(token);
  console.error(`✅ Found ${catalogModels.length} models from catalog`);

  console.error("Fetching models from GitHub Copilot endpoints...");
  const copilotModels = await fetchCopilotModels(token);

  // Combine and deduplicate models by ID
  const allModels = [...catalogModels];
  const catalogIds = new Set(catalogModels.map((m) => m.id));

  for (const copilotModel of copilotModels) {
    if (!catalogIds.has(copilotModel.id)) {
      allModels.push(copilotModel);
    }
  }

  const totalUnique = allModels.length;
  const catalogCount = catalogModels.length;
  const copilotUniqueCount = totalUnique - catalogCount;

  console.error(
    `✅ Total: ${totalUnique} unique models (${catalogCount} catalog + ${copilotUniqueCount} Copilot-only)`,
  );

  return allModels;
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

/** Debug request details with redacted auth token */
function debugRequest(
  url: string,
  headers: Record<string, string>,
  body: string,
): void {
  const redactedHeaders = { ...headers };
  if (redactedHeaders.Authorization) {
    redactedHeaders.Authorization = redactedHeaders.Authorization.replace(
      /Bearer .+/,
      "Bearer [REDACTED]",
    );
  }

  console.error("\n--- REQUEST DEBUG ---");
  console.error("URL:", url);
  console.error("Headers:", JSON.stringify(redactedHeaders, null, 2));
  console.error("Body:", body);
  console.error("--- END REQUEST ---\n");
}

/** Debug response details */
async function debugResponse(response: Response): Promise<void> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const bodyText = await response.text();

  console.error("--- RESPONSE DEBUG ---");
  console.error("Status:", response.status, response.statusText);
  console.error("Headers:", JSON.stringify(headers, null, 2));
  console.error("Body:", bodyText);
  console.error("--- END RESPONSE ---\n");
}

function validateResponseContent(responseData: unknown): boolean {
  try {
    if (typeof responseData === "object" && responseData !== null) {
      const data = responseData as Record<string, unknown>;

      // Check for standard OpenAI-style response format
      if (data.choices && Array.isArray(data.choices)) {
        const choice = data.choices[0] as Record<string, unknown>;
        if (
          choice?.message && typeof choice.message === "object" &&
          choice.message !== null
        ) {
          const message = choice.message as Record<string, unknown>;
          if (typeof message.content === "string") {
            const content = message.content.trim();
            // Must have actual text content (even single characters like "4" are valid responses)
            return content.length >= 1 && /\S/.test(content); // Non-whitespace content
          }
        }
        if (
          choice?.delta && typeof choice.delta === "object" &&
          choice.delta !== null
        ) {
          const delta = choice.delta as Record<string, unknown>;
          if (typeof delta.content === "string") {
            const content = delta.content.trim();
            return content.length >= 1 && /\S/.test(content);
          }
        }
      }

      // Check for alternative response formats
      if (typeof data.content === "string") {
        const content = data.content.trim();
        return content.length >= 1 && /\S/.test(content);
      }

      if (typeof data.text === "string") {
        const content = data.text.trim();
        return content.length >= 1 && /\S/.test(content);
      }
    }

    // If no recognizable content format, consider invalid
    return false;
  } catch {
    return false;
  }
}

/** Test if a model is accessible via inference API with rigorous validation */
async function testModelAccess(
  model: GitHubModel,
  token: string,
): Promise<boolean> {
  const url = "https://models.github.ai/inference/chat/completions";

  try {
    // Use a meaningful test prompt that should generate real content
    const testPrompt = "What is 2+2? Answer with just the number.";

    // Different models require different token parameters
    const isO1Model = model.id.includes("/o1");
    const isGpt5Model = model.id.includes("/gpt-5");
    const usesCompletionTokens = isO1Model || isGpt5Model;

    const requestBody: Record<string, unknown> = {
      model: model.id,
      messages: [{ role: "user", content: testPrompt }],
      // Request enough tokens for meaningful response
      ...(usesCompletionTokens
        ? { max_completion_tokens: 10 }
        : { max_tokens: 10 }),
    };

    // Only add temperature for models that support it (O1 and GPT-5 models don't support temperature parameter)
    if (!isGpt5Model && !isO1Model) {
      requestBody.temperature = 0; // Deterministic responses for testing
    }

    const headers = {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const bodyJson = JSON.stringify(requestBody);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: bodyJson,
    });

    // For debugging, we'll check response regardless of status
    if (!response.ok) {
      // Debug failed requests
      debugRequest(url, headers, bodyJson);
      await debugResponse(response.clone());

      try {
        const responseText = await response.text();
        let errorData;
        let errorMessage = "";
        let errorType = "";
        let errorCode = "";

        // Try to parse as JSON first
        try {
          errorData = JSON.parse(responseText);
          errorMessage = errorData.error?.message || "";
          errorType = errorData.error?.type || "";
          errorCode = errorData.error?.code || "";
        } catch {
          // If not JSON, treat the whole response as the error message
          errorMessage = responseText;
        }

        // Check if this is a parameter issue we can retry with different params
        if (
          (errorMessage.includes("max_tokens") &&
            errorMessage.includes("max_completion_tokens")) ||
          (errorMessage.includes("temperature") &&
            errorMessage.includes("not support"))
        ) {
          console.error(`🔄 Retrying ${model.id} with adjusted parameters...`);

          // Retry with simplified parameters - just the basics
          const retryBody: Record<string, unknown> = {
            model: model.id,
            messages: [{ role: "user", content: testPrompt }],
          };

          // Try different token parameter combinations
          if (errorMessage.includes("max_completion_tokens")) {
            retryBody.max_completion_tokens = 10;
          } else if (!errorMessage.includes("max_tokens")) {
            retryBody.max_tokens = 10;
          }

          const retryResponse = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(retryBody),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            if (validateResponseContent(retryData)) {
              console.error(
                `✅ Model ${model.id}: Accessible and responding (with adjusted parameters)`,
              );
              return true;
            } else {
              console.error(
                `❌ Model ${model.id}: Response lacks meaningful content (retry)`,
              );
              return false;
            }
          }
          // If retry also fails, continue with original error handling
        }

        // Specific error cases that indicate no access
        if (
          errorMessage.toLowerCase().includes("unknown model") ||
          errorMessage.toLowerCase().includes("model not found") ||
          errorMessage.toLowerCase().includes("not authorized") ||
          errorMessage.toLowerCase().includes("access denied") ||
          errorCode === "model_not_found" ||
          response.status === 404
        ) {
          console.error(`❌ Model ${model.id}: No access (${errorMessage})`);
          return false;
        }

        // Rate limiting or temporary errors - fail immediately as requested
        if (
          response.status === 429 ||
          response.status >= 500 ||
          errorMessage.toLowerCase().includes("rate limit") ||
          errorMessage.toLowerCase().includes("quota") ||
          errorType === "rate_limit_exceeded"
        ) {
          console.error(
            `❌ Rate limited or server error for ${model.id}: ${errorMessage}`,
          );
          throw new Error(`Rate limit or server error: ${errorMessage}`);
        }

        // Authentication issues - fail immediately
        if (response.status === 401 || response.status === 403) {
          console.error(`❌ Authentication failed for ${model.id}`);
          throw new Error(`Authentication error: ${errorMessage}`);
        }

        // Any other error - fail immediately as requested
        console.error(`❌ Unexpected error for ${model.id}: ${errorMessage}`);
        throw new Error(`Unexpected API error: ${errorMessage}`);
      } catch (parseError) {
        // If we can't parse the error response, it's likely a serious issue
        console.error(`❌ Failed to parse error response for ${model.id}`);
        throw new Error(`Failed to parse error response: ${parseError}`);
      }
    }

    // Response was successful - now validate it contains real content
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error(`❌ Failed to parse successful response for ${model.id}`);
      debugRequest(url, headers, bodyJson);
      await debugResponse(response.clone());
      throw new Error(`Failed to parse response JSON: ${parseError}`);
    }

    // Validate the response contains meaningful content
    if (!validateResponseContent(responseData)) {
      console.error(`❌ Model ${model.id}: Response lacks meaningful content`);
      console.error("Response data:", JSON.stringify(responseData, null, 2));
      return false;
    }

    console.error(`✅ Model ${model.id}: Accessible and responding`);
    return true;
  } catch (error) {
    // ANY error during testing means we should break immediately
    console.error(
      `❌ Error testing ${model.id}:`,
      error instanceof Error ? error.message : String(error),
    );

    // For network timeouts or connection errors, provide more context
    if (error instanceof TypeError && error.message.includes("fetch")) {
      console.error("Network connectivity issue - check internet connection");
    }

    // Re-throw to break the testing process as requested
    throw error;
  }
}

/** Filter models to only those accessible by the user */
async function filterAccessibleModels(
  models: GitHubModel[],
  token: string,
): Promise<GitHubModel[]> {
  console.error("Testing model accessibility with rigorous validation...");
  console.error(`Testing ${models.length} models (this may take a moment)\n`);

  const accessibleModels: GitHubModel[] = [];

  // Process models sequentially to avoid rate limits and provide clear debugging
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const _progress = Math.floor(((i + 1) / models.length) * 100);

    try {
      console.error(`[${i + 1}/${models.length}] Testing ${model.id}...`);

      const isAccessible = await testModelAccess(model, token);
      if (isAccessible) {
        accessibleModels.push(model);
      }

      // Small delay to be respectful to the API
      if (i < models.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (error) {
      // If ANY error occurs during testing, break immediately as requested
      console.error(`\n❌ BREAKING: Error occurred while testing ${model.id}`);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : String(error),
      );
      console.error("\nStopping accessibility testing due to error.");

      // Ask user if they want to continue with models tested so far
      if (accessibleModels.length > 0) {
        console.error(
          `\nFound ${accessibleModels.length} accessible models before error occurred.`,
        );
        console.error(
          "Returning those models. Consider running again to test remaining models.",
        );
      } else {
        console.error("No accessible models found before error occurred.");
        throw error; // Re-throw to exit the program
      }
      break;
    }
  }

  console.error(
    `\n✅ Accessibility testing complete. Found ${accessibleModels.length}/${models.length} accessible models.\n`,
  );
  return accessibleModels;
}

/** Format and output models based on options */
function outputModels(models: GitHubModel[], options: CliOptions): void {
  if (options.idsOnly) {
    // Output model IDs in OpenCode config format
    models.forEach((model) => console.log(`github-copilot/${model.id}`));
  } else {
    // Output formatted list with names and publishers in OpenCode config format
    models.forEach((model) => {
      console.log(
        `github-copilot/${model.id} - ${model.name} (${model.publisher})`,
      );
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
  const models = await fetchAllModels(token);

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

  // Filter by publisher first if specified (to reduce number of models to test)
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

  // Filter by accessibility if requested (do this after publisher filtering to reduce workload)
  if (options.accessibleOnly) {
    try {
      filteredModels = await filterAccessibleModels(filteredModels, token);
    } catch (error) {
      console.error("\nFailed to test model accessibility:");
      console.error(error instanceof Error ? error.message : String(error));
      console.error("\nThis could be due to:");
      console.error("- Network connectivity issues");
      console.error("- API rate limiting");
      console.error("- Authentication problems");
      console.error("- Server errors");
      console.error(
        "\nTry running the command again, or remove --accessible-only to see all models.",
      );
      Deno.exit(1);
    }

    if (filteredModels.length === 0) {
      console.error("No accessible models found for your account.");
      console.error("Check your GitHub Copilot license and try again.");
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
