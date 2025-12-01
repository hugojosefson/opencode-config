#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^2.5.2";DENO_RUN_ARGS="--allow-net --allow-read --allow-write --allow-run";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v "$1" 2>&1)" ];};n(){ [ "$(id -u)" != 0 ];};g(){ if n && ! h;then return;fi;u="$(n&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g "$1")";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};w(){ [ -n "$1" ] && "$1" -V >/dev/null 2>&1;};U="$(l=$(printf "%s" "$V"|wc -c);for i in $(seq 1 $l);do c=$(printf "%s" "$V"|cut -c $i);printf '%%%02X' "'$c";done)";D="$(w "$(command -v deno||:)"||:)";t(){ i="$(if h findmnt;then findmnt -Ononoexec,noro -ttmpfs -nboAVAIL,TARGET|sort -rn|while IFS=$'\n\t ' read -r a m;do [ "$a" -ge 150000000 ]&&[ -d "$m" ]&&printf %s "$m"&&break||:;done;fi)";printf %s "${i:-"${TMPDIR:-/tmp}"}";};s(){ deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";s&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";ln -sf "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v"|grep -iv discord>&2);};e;exec deno run $A "$0" "$@"

/**
 * GitHub Copilot model testing monitor
 *
 * Manages rate-limited model testing with exponential backoff,
 * state persistence, and model prioritization.
 */

interface ModelTestState {
  modelId: string;
  lastTestTime?: number;
  testResult?: "success" | "failure" | "rate_limited" | "auth_error";
  nextRetryTime?: number;
  backoffLevel: number;
  priority: number; // 1=highest, 5=lowest
  errorMessage?: string;
  responseTime?: number;
}

interface MonitorState {
  models: Record<string, ModelTestState>;
  lastApiCall?: number;
  globalBackoffUntil?: number;
  lastResearchTime?: number;
  rateLimitInfo?: {
    remaining?: number;
    resetTime?: number;
    retryAfter?: number;
  };
}

interface GitHubModel {
  id: string;
  name: string;
  publisher: string;
  description?: string;
  model_family?: string;
  tasks?: string[];
}

interface CliOptions {
  poll: boolean;
  status: boolean;
  next: boolean;
  research: boolean;
  reset: boolean;
  help: boolean;
  batchSize?: number;
}

const STATE_FILE = "model-test-state.json";
const INITIAL_BACKOFF_HOURS = 1;
const MAX_BACKOFF_HOURS = 24;
const _RESEARCH_INTERVAL_HOURS = 6;
const DEFAULT_BATCH_SIZE = 3;

// Priority mapping for important models
const MODEL_PRIORITIES: Record<string, number> = {
  // Tier 1: Most important models (priority 1)
  "anthropic/claude-3.5-sonnet": 1,
  "anthropic/claude-3-opus": 1,
  "openai/gpt-4o": 1,
  "openai/gpt-4o-mini": 1,
  "microsoft/phi-4": 1,
  "meta-llama/llama-3.2-90b-vision-instruct": 1,

  // Tier 2: Important models (priority 2)
  "anthropic/claude-3-haiku": 2,
  "openai/gpt-4-turbo": 2,
  "meta-llama/llama-3.2-11b-vision-instruct": 2,
  "meta-llama/llama-3.1-70b-instruct": 2,
  "mistralai/mistral-large-2407": 2,

  // Tier 3: Valuable models (priority 3)
  "openai/gpt-4": 3,
  "meta-llama/llama-3.1-8b-instruct": 3,
  "microsoft/phi-3.5-mini-instruct": 3,
  "mistralai/mistral-7b-instruct": 3,

  // Tier 4: Experimental models (priority 4)
  "ai21labs/jamba-1.5-large": 4,
  "cohere/command-r-plus": 4,
  // Tier 5: Lowest priority (priority 5) - catch-all for others
};

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    poll: false,
    status: false,
    next: false,
    research: false,
    reset: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--poll":
        options.poll = true;
        break;
      case "--status":
        options.status = true;
        break;
      case "--next":
        options.next = true;
        break;
      case "--research":
        options.research = true;
        break;
      case "--reset":
        options.reset = true;
        break;
      case "--batch-size":
        if (i + 1 >= args.length) {
          console.error("Error: --batch-size requires a value");
          Deno.exit(1);
        }
        options.batchSize = parseInt(args[++i]);
        if (isNaN(options.batchSize) || options.batchSize < 1) {
          console.error("Error: --batch-size must be a positive integer");
          Deno.exit(1);
        }
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

function showHelp(): void {
  console.log(`GitHub Copilot Model Testing Monitor

Autonomous polling system for rate-limited GitHub Copilot model testing.
Respects API limits, implements exponential backoff, and persists state.

USAGE:
  ./src/model-monitor.ts [OPTIONS]

OPTIONS:
  --poll                Test next available models and update state
  --status              Show current testing state and timing info
  --next                Show which models will be tested next and when
  --research            Research accessible models and update state
  --reset               Reset all state and start fresh
  --batch-size <num>    Number of models to test per polling cycle (default: ${DEFAULT_BATCH_SIZE})
  --help, -h            Show this help message

POLLING WORKFLOW:
  # Check what's ready to test
  ./src/model-monitor.ts --status
  ./src/model-monitor.ts --next
  
  # Test next batch of models
  ./src/model-monitor.ts --poll
  
  # Research new models when nothing ready to test
  ./src/model-monitor.ts --research

FEATURES:
  • Rate limit aware with exponential backoff (1h → 2h → 4h → 8h → 24h max)
  • Uses LATER of: API retry-after header OR exponential backoff calculation
  • Intelligent model prioritization (Claude, GPT-4o, Llama, Phi-4 first)
  • State persistence in ${STATE_FILE}
  • Batch testing to maximize API usage efficiency
  • Research integration during idle periods

AUTHENTICATION:
  Requires GitHub CLI authentication. Run 'gh auth login' if not authenticated.
`);
}

async function loadState(): Promise<MonitorState> {
  try {
    const data = await Deno.readTextFile(STATE_FILE);
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return { models: {} };
    }
    throw new Error(
      `Failed to load state: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function saveState(state: MonitorState): Promise<void> {
  try {
    await Deno.writeTextFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (error) {
    throw new Error(
      `Failed to load state: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

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
        throw new Error(
          "Not authenticated with GitHub CLI. Run 'gh auth login' first.",
        );
      } else {
        throw new Error(`Failed to get GitHub CLI token: ${errorText}`);
      }
    }

    return new TextDecoder().decode(stdout).trim();
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(
        "GitHub CLI (gh) not found. Please install it first: https://cli.github.com/",
      );
    }
    throw error;
  }
}

async function fetchAvailableModels(_token: string): Promise<GitHubModel[]> {
  console.error("🔍 Fetching available models from GitHub...");

  // Use the existing github-models.ts script for comprehensive model discovery
  try {
    const cmd = new Deno.Command("./src/github-models.ts", {
      args: ["--json"],
      stdout: "piped",
      stderr: "piped",
    });

    const { code, stdout, stderr } = await cmd.output();

    if (code !== 0) {
      const errorText = new TextDecoder().decode(stderr);
      throw new Error(`Failed to fetch models: ${errorText}`);
    }

    const models = JSON.parse(new TextDecoder().decode(stdout));
    console.error(`✅ Found ${models.length} total models`);
    return models;
  } catch (error) {
    throw new Error(
      `Model discovery failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function getModelPriority(modelId: string): number {
  // Check exact matches first
  if (MODEL_PRIORITIES[modelId]) {
    return MODEL_PRIORITIES[modelId];
  }

  // Check partial matches for model families
  for (const [pattern, priority] of Object.entries(MODEL_PRIORITIES)) {
    if (modelId.includes(pattern) || pattern.includes(modelId)) {
      return priority;
    }
  }

  // Default priority for unknown models
  return 5;
}

function calculateNextRetryTime(
  backoffLevel: number,
  apiRetryAfter?: number,
): number {
  const now = Date.now();

  // Calculate exponential backoff time
  const backoffHours = Math.min(
    INITIAL_BACKOFF_HOURS * Math.pow(2, backoffLevel),
    MAX_BACKOFF_HOURS,
  );
  const backoffMs = backoffHours * 60 * 60 * 1000;
  const exponentialTime = now + backoffMs;

  // Calculate API retry-after time
  const apiRetryTime = apiRetryAfter ? now + (apiRetryAfter * 1000) : 0;

  // Use the LATER of the two times
  return Math.max(exponentialTime, apiRetryTime);
}

function extractRateLimitInfo(
  headers: Headers,
): { remaining?: number; resetTime?: number; retryAfter?: number } {
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  const retryAfter = headers.get("retry-after");

  return {
    remaining: remaining ? parseInt(remaining) : undefined,
    resetTime: reset ? parseInt(reset) * 1000 : undefined, // Convert to milliseconds
    retryAfter: retryAfter ? parseInt(retryAfter) : undefined,
  };
}

async function testModelAccess(modelId: string, token: string): Promise<{
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  rateLimitInfo?: {
    remaining?: number;
    resetTime?: number;
    retryAfter?: number;
  };
}> {
  const startTime = Date.now();
  const url = "https://models.github.ai/inference/chat/completions";

  try {
    const testPrompt = "What is 2+2? Answer with just the number.";

    // Handle different model parameter requirements
    const isO1Model = modelId.includes("/o1");
    const isGpt5Model = modelId.includes("/gpt-5");
    const usesCompletionTokens = isO1Model || isGpt5Model;

    const requestBody: Record<string, unknown> = {
      model: modelId,
      messages: [{ role: "user", content: testPrompt }],
      ...(usesCompletionTokens
        ? { max_completion_tokens: 10 }
        : { max_tokens: 10 }),
    };

    // Only add temperature for models that support it
    if (!isGpt5Model && !isO1Model) {
      requestBody.temperature = 0;
    }

    const headers = {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;
    const rateLimitInfo = extractRateLimitInfo(response.headers);

    if (!response.ok) {
      const responseText = await response.text();
      let errorData;
      let errorMessage = "";

      try {
        errorData = JSON.parse(responseText);
        errorMessage = errorData.error?.message || "";
      } catch {
        errorMessage = responseText;
      }

      // Check for parameter issues and retry with adjusted params
      if (
        (errorMessage.includes("max_tokens") &&
          errorMessage.includes("max_completion_tokens")) ||
        (errorMessage.includes("temperature") &&
          errorMessage.includes("not support"))
      ) {
        const retryBody: Record<string, unknown> = {
          model: modelId,
          messages: [{ role: "user", content: testPrompt }],
        };

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
            return { success: true, responseTime, rateLimitInfo };
          }
        }
      }

      return {
        success: false,
        responseTime,
        errorMessage,
        rateLimitInfo,
      };
    }

    const responseData = await response.json();
    const isValid = validateResponseContent(responseData);

    return {
      success: isValid,
      responseTime,
      rateLimitInfo,
      errorMessage: isValid ? undefined : "Response lacks meaningful content",
    };
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function validateResponseContent(responseData: unknown): boolean {
  try {
    if (typeof responseData === "object" && responseData !== null) {
      const data = responseData as Record<string, unknown>;

      if (data.choices && Array.isArray(data.choices)) {
        const choice = data.choices[0] as Record<string, unknown>;
        if (
          choice?.message && typeof choice.message === "object" &&
          choice.message !== null
        ) {
          const message = choice.message as Record<string, unknown>;
          if (typeof message.content === "string") {
            const content = message.content.trim();
            return content.length >= 1 && /\S/.test(content);
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

      if (typeof data.content === "string") {
        const content = data.content.trim();
        return content.length >= 1 && /\S/.test(content);
      }

      if (typeof data.text === "string") {
        const content = data.text.trim();
        return content.length >= 1 && /\S/.test(content);
      }
    }

    return false;
  } catch {
    return false;
  }
}

function getNextModelsToTest(
  state: MonitorState,
  batchSize: number,
): ModelTestState[] {
  const now = Date.now();
  const availableModels = Object.values(state.models).filter((model) => {
    // Skip models in global backoff
    if (state.globalBackoffUntil && now < state.globalBackoffUntil) {
      return false;
    }

    // Skip models still in individual backoff
    if (model.nextRetryTime && now < model.nextRetryTime) {
      return false;
    }

    return true;
  });

  // Sort by priority (lower number = higher priority), then by last test time (older first)
  availableModels.sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // Prioritize untested models
    if (!a.lastTestTime && b.lastTestTime) return -1;
    if (a.lastTestTime && !b.lastTestTime) return 1;
    if (!a.lastTestTime && !b.lastTestTime) return 0;

    return (a.lastTestTime || 0) - (b.lastTestTime || 0);
  });

  return availableModels.slice(0, batchSize);
}

async function pollModels(options: CliOptions): Promise<void> {
  const batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  const state = await loadState();
  const token = await getGhToken();

  // Check global rate limit backoff
  const now = Date.now();
  if (state.globalBackoffUntil && now < state.globalBackoffUntil) {
    const waitMinutes = Math.ceil(
      (state.globalBackoffUntil - now) / (60 * 1000),
    );
    console.log(
      `⏰ Global rate limit backoff active. Wait ${waitMinutes} minutes before next poll.`,
    );
    return;
  }

  const modelsToTest = getNextModelsToTest(state, batchSize);

  if (modelsToTest.length === 0) {
    console.log("🎯 No models ready for testing. Try:");
    console.log(
      "   • ./src/model-monitor.ts --status (check when next models are ready)",
    );
    console.log("   • ./src/model-monitor.ts --research (discover new models)");
    console.log(
      "   • ./src/model-monitor.ts --next (see upcoming test schedule)",
    );
    return;
  }

  console.log(`🚀 Testing ${modelsToTest.length} models...`);

  let globalRateLimit = false;

  for (let i = 0; i < modelsToTest.length; i++) {
    const model = modelsToTest[i];
    console.log(
      `\n[${i + 1}/${modelsToTest.length}] Testing ${model.modelId}...`,
    );

    const result = await testModelAccess(model.modelId, token);

    // Update model state
    model.lastTestTime = now;
    model.responseTime = result.responseTime;

    if (result.success) {
      console.log(`✅ ${model.modelId}: Accessible (${result.responseTime}ms)`);
      model.testResult = "success";
      model.backoffLevel = 0; // Reset backoff on success
      delete model.nextRetryTime;
      delete model.errorMessage;
    } else {
      console.log(
        `❌ ${model.modelId}: ${result.errorMessage} (${result.responseTime}ms)`,
      );

      // Determine error type and set appropriate backoff
      if (
        result.errorMessage?.toLowerCase().includes("rate limit") ||
        result.errorMessage?.toLowerCase().includes("quota") ||
        result.rateLimitInfo?.retryAfter
      ) {
        model.testResult = "rate_limited";
        globalRateLimit = true;

        // Set global backoff using API retry-after if available
        const globalBackoffMs = result.rateLimitInfo?.retryAfter
          ? result.rateLimitInfo.retryAfter * 1000
          : 60 * 60 * 1000; // Default 1 hour
        state.globalBackoffUntil = now + globalBackoffMs;

        console.log(
          `⏱️  Rate limited - global backoff until ${
            new Date(state.globalBackoffUntil).toLocaleString()
          }`,
        );
        break; // Stop testing on rate limit
      } else if (
        result.errorMessage?.toLowerCase().includes("not authorized") ||
        result.errorMessage?.toLowerCase().includes("access denied")
      ) {
        model.testResult = "auth_error";
        model.backoffLevel = Math.min(model.backoffLevel + 1, 5);
        model.nextRetryTime = calculateNextRetryTime(
          model.backoffLevel,
          result.rateLimitInfo?.retryAfter,
        );
      } else {
        model.testResult = "failure";
        model.backoffLevel = Math.min(model.backoffLevel + 1, 5);
        model.nextRetryTime = calculateNextRetryTime(
          model.backoffLevel,
          result.rateLimitInfo?.retryAfter,
        );
      }

      model.errorMessage = result.errorMessage;
    }

    // Update rate limit info
    if (result.rateLimitInfo) {
      state.rateLimitInfo = result.rateLimitInfo;
    }

    // Save state after each test
    await saveState(state);

    // Add delay between tests to be respectful
    if (i < modelsToTest.length - 1 && !globalRateLimit) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (globalRateLimit) {
    console.log("\n⚠️  Hit rate limit - stopping batch test early");
  } else {
    console.log("\n✅ Batch testing complete");
  }

  state.lastApiCall = now;
  await saveState(state);
}

async function showStatus(): Promise<void> {
  const state = await loadState();
  const now = Date.now();

  console.log("📊 Model Testing Status\n");

  // Global status
  if (state.globalBackoffUntil && now < state.globalBackoffUntil) {
    const waitTime = state.globalBackoffUntil - now;
    const waitMinutes = Math.ceil(waitTime / (60 * 1000));
    console.log(
      `🚫 Global rate limit backoff: ${waitMinutes} minutes remaining`,
    );
    console.log(
      `   Next poll available: ${
        new Date(state.globalBackoffUntil).toLocaleString()
      }\n`,
    );
  } else {
    console.log("✅ No global rate limit backoff\n");
  }

  // Rate limit info
  if (state.rateLimitInfo) {
    console.log("📈 Latest Rate Limit Info:");
    if (state.rateLimitInfo.remaining !== undefined) {
      console.log(`   Remaining calls: ${state.rateLimitInfo.remaining}`);
    }
    if (state.rateLimitInfo.resetTime) {
      console.log(
        `   Reset time: ${
          new Date(state.rateLimitInfo.resetTime).toLocaleString()
        }`,
      );
    }
    console.log("");
  }

  // Model statistics
  const models = Object.values(state.models);
  const totalModels = models.length;
  const testedModels = models.filter((m) => m.lastTestTime).length;
  const successfulModels =
    models.filter((m) => m.testResult === "success").length;
  const readyToTest = getNextModelsToTest(state, 100).length; // Check all available

  console.log("📊 Model Statistics:");
  console.log(`   Total models: ${totalModels}`);
  console.log(`   Tested models: ${testedModels}`);
  console.log(`   Successful models: ${successfulModels}`);
  console.log(`   Ready to test: ${readyToTest}`);
  console.log("");

  // Show models by priority and status
  const priorityGroups = new Map<number, ModelTestState[]>();
  for (const model of models) {
    if (!priorityGroups.has(model.priority)) {
      priorityGroups.set(model.priority, []);
    }
    priorityGroups.get(model.priority)!.push(model);
  }

  for (
    const [priority, groupModels] of Array.from(priorityGroups).sort((
      [a],
      [b],
    ) => a - b)
  ) {
    const priorityName =
      ["", "High", "Important", "Valuable", "Experimental", "Low"][priority] ||
      "Unknown";
    console.log(`🎯 Priority ${priority} (${priorityName}):`);

    const successful = groupModels.filter((m) =>
      m.testResult === "success"
    ).length;
    const failed = groupModels.filter((m) => m.testResult === "failure").length;
    const rateLimited =
      groupModels.filter((m) => m.testResult === "rate_limited").length;
    const authErrors =
      groupModels.filter((m) => m.testResult === "auth_error").length;
    const untested = groupModels.filter((m) => !m.testResult).length;

    console.log(
      `   ✅ Success: ${successful}  ❌ Failed: ${failed}  ⏱️  Rate limited: ${rateLimited}  🔒 Auth error: ${authErrors}  ⭕ Untested: ${untested}`,
    );
  }
  console.log("");

  // Last activity
  if (state.lastApiCall) {
    const lastCall = new Date(state.lastApiCall).toLocaleString();
    console.log(`🕒 Last API call: ${lastCall}`);
  }

  if (state.lastResearchTime) {
    const lastResearch = new Date(state.lastResearchTime).toLocaleString();
    console.log(`🔍 Last research: ${lastResearch}`);
  }
}

async function showNext(): Promise<void> {
  const state = await loadState();
  const now = Date.now();

  console.log("🎯 Next Models to Test\n");

  // Check global backoff
  if (state.globalBackoffUntil && now < state.globalBackoffUntil) {
    const waitTime = state.globalBackoffUntil - now;
    const waitMinutes = Math.ceil(waitTime / (60 * 1000));
    console.log(`⏰ Global backoff active - ${waitMinutes} minutes remaining`);
    console.log(
      `   Next poll available: ${
        new Date(state.globalBackoffUntil).toLocaleString()
      }\n`,
    );
    return;
  }

  const nextModels = getNextModelsToTest(state, 10); // Show next 10

  if (nextModels.length === 0) {
    console.log("📭 No models ready for testing");

    // Show when next models will be ready
    const modelsInBackoff = Object.values(state.models)
      .filter((m) => m.nextRetryTime && m.nextRetryTime > now)
      .sort((a, b) => (a.nextRetryTime || 0) - (b.nextRetryTime || 0));

    if (modelsInBackoff.length > 0) {
      console.log("\n⏳ Next models to become available:");
      modelsInBackoff.slice(0, 5).forEach((model, i) => {
        const waitTime = (model.nextRetryTime || 0) - now;
        const waitMinutes = Math.ceil(waitTime / (60 * 1000));
        const priorityName = [
          "",
          "High",
          "Important",
          "Valuable",
          "Experimental",
          "Low",
        ][model.priority] || "Unknown";
        console.log(
          `   ${
            i + 1
          }. ${model.modelId} (Priority ${model.priority} - ${priorityName})`,
        );
        console.log(
          `      Available in ${waitMinutes} minutes (${
            new Date(model.nextRetryTime || 0).toLocaleString()
          })`,
        );
        if (model.errorMessage) {
          console.log(`      Last error: ${model.errorMessage}`);
        }
      });
    }

    console.log("\n💡 Suggestions:");
    console.log("   • ./src/model-monitor.ts --research (discover new models)");
    console.log("   • ./src/model-monitor.ts --status (check overall status)");
    return;
  }

  console.log(`📋 Next ${nextModels.length} models ready for testing:\n`);

  nextModels.forEach((model, i) => {
    const priorityName = [
      "",
      "High",
      "Important",
      "Valuable",
      "Experimental",
      "Low",
    ][model.priority] || "Unknown";
    const status = model.testResult
      ? ` (Last: ${model.testResult})`
      : " (Untested)";

    console.log(`${i + 1}. ${model.modelId}`);
    console.log(`   Priority: ${model.priority} (${priorityName})${status}`);

    if (model.lastTestTime) {
      const lastTest = new Date(model.lastTestTime).toLocaleString();
      console.log(`   Last tested: ${lastTest}`);
    }

    if (model.errorMessage) {
      console.log(`   Last error: ${model.errorMessage}`);
    }
    console.log("");
  });

  console.log("🚀 Run polling to test these models:");
  console.log("   ./src/model-monitor.ts --poll");
}

async function researchModels(): Promise<void> {
  console.log("🔍 Researching accessible GitHub Copilot models...\n");

  const state = await loadState();
  const token = await getGhToken();

  try {
    const availableModels = await fetchAvailableModels(token);
    let newModels = 0;
    let updatedModels = 0;

    for (const model of availableModels) {
      const modelId = model.id;

      if (!state.models[modelId]) {
        // New model discovered
        state.models[modelId] = {
          modelId,
          backoffLevel: 0,
          priority: getModelPriority(modelId),
        };
        newModels++;
      } else {
        // Update priority for existing model if needed
        const newPriority = getModelPriority(modelId);
        if (state.models[modelId].priority !== newPriority) {
          state.models[modelId].priority = newPriority;
          updatedModels++;
        }
      }
    }

    state.lastResearchTime = Date.now();
    await saveState(state);

    console.log(`✅ Research complete:`);
    console.log(`   Total models: ${availableModels.length}`);
    console.log(`   New models: ${newModels}`);
    console.log(`   Updated priorities: ${updatedModels}`);

    if (newModels > 0) {
      console.log("\n🎯 New high-priority models to test:");
      const newHighPriorityModels = Object.values(state.models)
        .filter((m) => !m.lastTestTime && m.priority <= 2)
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 5);

      newHighPriorityModels.forEach((model, i) => {
        const priorityName = ["", "High", "Important"][model.priority] ||
          "Unknown";
        console.log(
          `   ${
            i + 1
          }. ${model.modelId} (Priority ${model.priority} - ${priorityName})`,
        );
      });
    }

    console.log("\n🚀 Ready to start testing:");
    console.log("   ./src/model-monitor.ts --poll");
  } catch (error) {
    console.error(
      `❌ Research failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    Deno.exit(1);
  }
}

async function resetState(): Promise<void> {
  try {
    await Deno.remove(STATE_FILE);
    console.log("✅ State reset successfully");
    console.log("🔍 Run research to discover models:");
    console.log("   ./src/model-monitor.ts --research");
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      console.log("✅ No state file to reset");
    } else {
      console.error(
        `❌ Failed to reset state: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      Deno.exit(1);
    }
  }
}

async function main(): Promise<void> {
  const args = Deno.args;
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  // Validate that exactly one action is specified
  const actionCount = [
    options.poll,
    options.status,
    options.next,
    options.research,
    options.reset,
  ]
    .filter(Boolean).length;

  if (actionCount === 0) {
    console.error(
      "Error: Must specify an action (--poll, --status, --next, --research, or --reset)",
    );
    console.error("Use --help for usage information");
    Deno.exit(1);
  }

  if (actionCount > 1) {
    console.error("Error: Can only specify one action at a time");
    Deno.exit(1);
  }

  try {
    if (options.reset) {
      await resetState();
    } else if (options.research) {
      await researchModels();
    } else if (options.poll) {
      await pollModels(options);
    } else if (options.status) {
      await showStatus();
    } else if (options.next) {
      await showNext();
    }
  } catch (error) {
    console.error(
      `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("Unexpected error:", error.message);
    Deno.exit(1);
  });
}
