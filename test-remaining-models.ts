#!/bin/sh
// 2>/dev/null;DENO_VERSION_RANGE="^2.5.2";DENO_RUN_ARGS="--allow-net --allow-read --allow-write --allow-run";set -e;V="$DENO_VERSION_RANGE";A="$DENO_RUN_ARGS";h(){ [ -x "$(command -v "$1" 2>&1)" ];};n(){ [ "$(id -u)" != 0 ];};g(){ if n && ! h;then return;fi;u="$(n&&echo sudo||:)";if h brew;then echo "brew install $1";elif h apt;then echo "($u apt update && $u DEBIAN_FRONTEND=noninteractive apt install -y $1)";elif h yum;then echo "$u yum install -y $1";elif h pacman;then echo "$u pacman -yS --noconfirm $1";elif h opkg-install;then echo "$u opkg-install $1";fi;};p(){ q="$(g "$1")";if [ -z "$q" ];then echo "Please install '$1' manually, then try again.">&2;exit 1;fi;eval "o=\"\$(set +o)\";set -x;$q;set +x;eval \"\$o\"">&2;};f(){ h "$1"||p "$1";};w(){ [ -n "$1" ] && "$1" -V >/dev/null 2>&1;};U="$(l=$(printf "%s" "$V"|wc -c);for i in $(seq 1 $l);do c=$(printf "%s" "$V"|cut -c $i);printf '%%%02X' "'$c";done)";D="$(w "$(command -v deno||:)"||:)";t(){ i="$(if h findmnt;then findmnt -Ononoexec,noro -ttmpfs -nboAVAIL,TARGET|sort -rn|while IFS=$'\n\t ' read -r a m;do [ "$a" -ge 150000000 ]&&[ -d "$m" ]&&printf %s "$m"&&break||:;done;fi)";printf %s "${i:-"${TMPDIR:-/tmp}"}";};s(){ deno eval "import{satisfies as e}from'https://deno.land/x/semver@v1.4.1/mod.ts';Deno.exit(e(Deno.version.deno,'$V')?0:1);">/dev/null 2>&1;};e(){ R="$(t)/deno-range-$V/bin";mkdir -p "$R";export PATH="$R:$PATH";s&&return;f curl;v="$(curl -sSfL "https://semver-version.deno.dev/api/github/denoland/deno/$U")";i="$(t)/deno-$v";ln -sf "$i/bin/deno" "$R/deno";s && return;f unzip;([ "${A#*-q}" != "$A" ]&&exec 2>/dev/null;curl -fsSL https://deno.land/install.sh|DENO_INSTALL="$i" sh -s $DENO_INSTALL_ARGS "$v"|grep -iv discord>&2);};e;exec deno run $A "$0" "$@"

/**
 * Comprehensive test of remaining untested models across all providers
 * Focus on Mistral, additional variants, and previously untested models
 */

interface TestResult {
  modelId: string;
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  rateLimited?: boolean;
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
      throw new Error(`Failed to get GitHub CLI token: ${errorText}`);
    }

    return new TextDecoder().decode(stdout).trim();
  } catch (error) {
    throw new Error(
      `Authentication failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

async function testModelAccess(
  modelId: string,
  token: string,
): Promise<TestResult> {
  const startTime = Date.now();
  const url = "https://models.github.ai/inference/chat/completions";

  try {
    console.log(`🧪 Testing ${modelId}...`);

    const requestBody = {
      model: modelId,
      messages: [{
        role: "user",
        content: "What is 2+2? Answer with just the number.",
      }],
      max_tokens: 10,
      temperature: 0,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseTime = Date.now() - startTime;

    // Check response headers for rate limit info
    const rateLimitRemaining = response.headers.get("x-ratelimit-remaining");
    const retryAfter = response.headers.get("retry-after");

    console.log(`   Response time: ${responseTime}ms`);
    if (rateLimitRemaining) {
      console.log(`   Rate limit remaining: ${rateLimitRemaining}`);
    }
    if (retryAfter) {
      console.log(`   Retry after: ${retryAfter}s`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = "";

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error?.message || errorText;
      } catch {
        errorMessage = errorText;
      }

      const isRateLimit = errorMessage.toLowerCase().includes("rate limit") ||
        errorMessage.toLowerCase().includes("quota") ||
        retryAfter !== null;

      return {
        modelId,
        success: false,
        responseTime,
        errorMessage,
        rateLimited: isRateLimit,
      };
    }

    const responseData = await response.json();
    const hasValidContent = responseData.choices &&
      responseData.choices[0] &&
      responseData.choices[0].message &&
      typeof responseData.choices[0].message.content === "string" &&
      responseData.choices[0].message.content.trim().length > 0;

    return {
      modelId,
      success: hasValidContent,
      responseTime,
      errorMessage: hasValidContent ? undefined : "No valid response content",
    };
  } catch (error) {
    return {
      modelId,
      success: false,
      responseTime: Date.now() - startTime,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main(): Promise<void> {
  console.log("🚀 Comprehensive Testing of Remaining Models");
  console.log("==========================================\n");

  // Focus on untested providers and high-value models
  const testModels = [
    // Mistral AI models (highest priority - new provider)
    "mistral-ai/mistral-large-2411",
    "mistral-ai/codestral-2501",
    "mistral-ai/mistral-nemo",
    "mistral-ai/mistral-small-2503",
    "mistral-ai/ministral-3b",
    "mistral-ai/mistral-medium-2505",

    // Additional DeepSeek variants
    "deepseek/deepseek-r1-0528",

    // Additional Meta variants
    "meta/llama-3.3-70b-instruct",
    "meta/llama-4-maverick-17b-128e-instruct-fp8",
    "meta/llama-4-scout-17b-16e-instruct",

    // Additional AI21 models
    "ai21-labs/ai21-jamba-1.5-mini",

    // Additional Cohere models (test embedding model again)
    "cohere/cohere-command-a",

    // Test a few non-provider-prefixed models that might work
    "gpt-4o-mini",
    "gpt-4o",

    // Microsoft variants we haven't fully explored
    "microsoft/mai-ds-r1",
  ];

  try {
    const token = await getGhToken();
    console.log("✅ GitHub CLI authentication successful\n");

    const results: TestResult[] = [];
    let rateLimitEncountered = false;

    for (let i = 0; i < testModels.length; i++) {
      const modelId = testModels[i];

      console.log(`[${i + 1}/${testModels.length}] Testing ${modelId}`);

      const result = await testModelAccess(modelId, token);
      results.push(result);

      if (result.success) {
        console.log(`   ✅ SUCCESS - ${result.responseTime}ms`);
      } else if (result.rateLimited) {
        console.log(`   ⚠️  RATE LIMITED - ${result.errorMessage}`);
        console.log("   🛑 Stopping tests due to rate limit");
        rateLimitEncountered = true;
        break;
      } else {
        console.log(
          `   ❌ FAILED - ${result.errorMessage} (${result.responseTime}ms)`,
        );
      }

      // Add delay between tests to be respectful
      if (i < testModels.length - 1) {
        console.log("   ⏱️  Waiting 2 seconds...\n");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } else {
        console.log("");
      }
    }

    // Summary
    console.log("📊 Test Results Summary");
    console.log("=====================");

    const successful = results.filter((r) => r.success);
    const rateLimited = results.filter((r) => r.rateLimited);
    const failed = results.filter((r) => !r.success && !r.rateLimited);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`⚠️  Rate Limited: ${rateLimited.length}`);
    console.log(`❌ Failed: ${failed.length}`);
    console.log("");

    if (successful.length > 0) {
      console.log("🎉 NEW DISCOVERIES!");
      console.log("✅ Successfully tested models:");
      successful.forEach((result) => {
        console.log(`   • ${result.modelId} (${result.responseTime}ms)`);
      });
      console.log("");
    }

    if (rateLimited.length > 0) {
      console.log("⚠️  Models that hit rate limits:");
      rateLimited.forEach((result) => {
        console.log(`   • ${result.modelId}: ${result.errorMessage}`);
      });
      console.log("");
    }

    if (failed.length > 0) {
      console.log("❌ Models with other failures:");
      failed.forEach((result) => {
        console.log(
          `   • ${result.modelId}: ${result.errorMessage} (${result.responseTime}ms)`,
        );
      });
      console.log("");
    }

    // Provider analysis
    console.log("📈 Provider Analysis");
    console.log("==================");

    const providerStats = new Map<
      string,
      { tested: number; successful: number }
    >();

    results.forEach((result) => {
      const provider = result.modelId.includes("/")
        ? result.modelId.split("/")[0]
        : "unknown";
      const stats = providerStats.get(provider) || { tested: 0, successful: 0 };
      stats.tested++;
      if (result.success) stats.successful++;
      providerStats.set(provider, stats);
    });

    providerStats.forEach((stats, provider) => {
      const successRate = Math.round((stats.successful / stats.tested) * 100);
      console.log(
        `${provider}: ${stats.successful}/${stats.tested} (${successRate}% success rate)`,
      );
    });

    console.log("");
    console.log("🔬 Research Status Update");
    console.log("========================");
    console.log(`Total models tested this session: ${results.length}`);
    console.log(`New working models discovered: ${successful.length}`);
    console.log(
      `Rate limits encountered: ${rateLimitEncountered ? "Yes" : "No"}`,
    );

    if (!rateLimitEncountered && successful.length > 0) {
      console.log("🚀 Ready for next testing round!");
    }
  } catch (error) {
    console.error(
      `❌ Test failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
