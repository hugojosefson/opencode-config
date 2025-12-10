#!/usr/bin/env -S deno run --allow-net --allow-run=gh --allow-read=. --allow-write=.
/**
 * Test new Claude models with GitHub Copilot credentials
 * Tests: claude-haiku-4.5 and claude-opus-4.5
 */

interface TestResult {
  modelId: string;
  basicResponse: {
    success: boolean;
    responseTime: number;
    content?: string;
    error?: string;
  };
  toolSupport: {
    success: boolean;
    responseTime: number;
    toolCalled?: boolean;
    toolName?: string;
    error?: string;
  };
  overallStatus: "working" | "partial" | "failed";
  notes: string[];
}

/** Get GitHub auth token */
async function getGhToken(): Promise<string> {
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
}

/** Test basic chat completion */
async function testBasicResponse(
  modelId: string,
  token: string,
): Promise<TestResult["basicResponse"]> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      "https://api.githubcopilot.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Editor-Version": "vscode/1.95.0",
          "Editor-Plugin-Version": "copilot-chat/0.22.0",
          "User-Agent": "GitHubCopilotChat/0.22.0",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "user",
              content: "What is 2+2? Answer with just the number.",
            },
          ],
          max_tokens: 100,
          temperature: 0.7,
          stream: false,
        }),
      },
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return {
        success: false,
        responseTime,
        error: "No content in response",
      };
    }

    return {
      success: true,
      responseTime,
      content: content.trim(),
    };
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Test tool calling capability */
async function testToolSupport(
  modelId: string,
  token: string,
): Promise<TestResult["toolSupport"]> {
  const startTime = Date.now();

  try {
    const response = await fetch(
      "https://api.githubcopilot.com/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Editor-Version": "vscode/1.95.0",
          "Editor-Plugin-Version": "copilot-chat/0.22.0",
          "User-Agent": "GitHubCopilotChat/0.22.0",
        },
        body: JSON.stringify({
          model: modelId,
          messages: [
            {
              role: "user",
              content: "List the files in the current directory using the bash tool.",
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "bash",
                description: "Execute a bash command",
                parameters: {
                  type: "object",
                  properties: {
                    command: {
                      type: "string",
                      description: "The bash command to execute",
                    },
                  },
                  required: ["command"],
                },
              },
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
          stream: false,
        }),
      },
    );

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        responseTime,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) {
      return {
        success: false,
        responseTime,
        error: "No message in response",
      };
    }

    // Check if tool was called
    const toolCalls = message.tool_calls;
    if (toolCalls && Array.isArray(toolCalls) && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      return {
        success: true,
        responseTime,
        toolCalled: true,
        toolName: toolCall.function?.name,
      };
    }

    // No tool call - check if there's a content response instead
    if (message.content) {
      return {
        success: false,
        responseTime,
        toolCalled: false,
        error: "Model responded with text instead of tool call",
      };
    }

    return {
      success: false,
      responseTime,
      toolCalled: false,
      error: "No tool call and no content in response",
    };
  } catch (error) {
    return {
      success: false,
      responseTime: Date.now() - startTime,
      toolCalled: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Test a single model */
async function testModel(modelId: string, token: string): Promise<TestResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${modelId}`);
  console.log("=".repeat(60));

  const result: TestResult = {
    modelId,
    basicResponse: { success: false, responseTime: 0 },
    toolSupport: { success: false, responseTime: 0, toolCalled: false },
    overallStatus: "failed",
    notes: [],
  };

  // Test basic response
  console.log("\n[1/2] Testing basic response...");
  result.basicResponse = await testBasicResponse(modelId, token);

  if (result.basicResponse.success) {
    console.log(
      `✅ Basic response works (${result.basicResponse.responseTime}ms)`,
    );
    console.log(`   Response: "${result.basicResponse.content}"`);
  } else {
    console.log(`❌ Basic response failed: ${result.basicResponse.error}`);
    result.notes.push(`Basic response failed: ${result.basicResponse.error}`);
    return result; // Skip tool test if basic response fails
  }

  // Small delay between tests
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Test tool support
  console.log("\n[2/2] Testing tool support...");
  result.toolSupport = await testToolSupport(modelId, token);

  if (result.toolSupport.success && result.toolSupport.toolCalled) {
    console.log(
      `✅ Tool support works (${result.toolSupport.responseTime}ms)`,
    );
    console.log(`   Tool called: ${result.toolSupport.toolName}`);
    result.overallStatus = "working";
    result.notes.push("Full tool support confirmed");
  } else if (result.toolSupport.success && !result.toolSupport.toolCalled) {
    console.log(`⚠️  Tool support partial: ${result.toolSupport.error}`);
    result.overallStatus = "partial";
    result.notes.push(result.toolSupport.error || "No tool call made");
  } else {
    console.log(`❌ Tool support failed: ${result.toolSupport.error}`);
    result.overallStatus = "partial";
    result.notes.push(`Tool support failed: ${result.toolSupport.error}`);
  }

  return result;
}

/** Update model-test-state.json with results */
async function updateTestState(results: TestResult[]): Promise<void> {
  const testStatePath = "./model-test-state.json";

  let testState: Record<string, unknown>;
  try {
    const content = await Deno.readTextFile(testStatePath);
    testState = JSON.parse(content);
  } catch {
    testState = { models: {} };
  }

  const models = testState.models as Record<string, unknown>;

  for (const result of results) {
    const fullModelId = `github-copilot/${result.modelId}`;
    models[fullModelId] = {
      modelId: fullModelId,
      backoffLevel: 0,
      priority: result.overallStatus === "working" ? 1 : 5,
      lastTestTime: Date.now(),
      responseTime: result.basicResponse.responseTime +
        result.toolSupport.responseTime,
      testResult: result.overallStatus === "working" ? "success" : "failure",
      openCodeCompatible: result.overallStatus === "working",
      openCodeModel: fullModelId,
      openCodeToolCapability: result.toolSupport.success &&
        result.toolSupport.toolCalled,
      openCodeNotes: result.notes.join("; "),
      provider: "Anthropic",
    };
  }

  // Update summary stats
  const allModels = Object.values(models) as Array<{
    openCodeCompatible?: boolean;
  }>;
  const workingCount = allModels.filter((m) => m.openCodeCompatible === true)
    .length;
  const totalTested = allModels.filter((m) =>
    m.openCodeCompatible !== undefined
  ).length;

  testState.openCodeWorkingModels = workingCount;
  testState.openCodeTotalTested = totalTested;
  testState.openCodeSuccessRate = totalTested > 0
    ? workingCount / totalTested
    : 0;
  testState.lastResearchTime = Date.now();

  await Deno.writeTextFile(
    testStatePath,
    JSON.stringify(testState, null, 2) + "\n",
  );

  console.log(`\n✅ Updated ${testStatePath}`);
}

/** Generate summary report */
function generateReport(results: TestResult[]): string {
  const timestamp = new Date().toISOString().split("T")[0];
  let report = `# New Claude Models Test Report\n\n`;
  report += `**Test Date:** ${timestamp}\n`;
  report += `**Models Tested:** ${results.length}\n\n`;

  report += `## Summary\n\n`;

  const working = results.filter((r) => r.overallStatus === "working");
  const partial = results.filter((r) => r.overallStatus === "partial");
  const failed = results.filter((r) => r.overallStatus === "failed");

  report += `- ✅ Working: ${working.length}\n`;
  report += `- ⚠️  Partial: ${partial.length}\n`;
  report += `- ❌ Failed: ${failed.length}\n\n`;

  report += `## Detailed Results\n\n`;

  for (const result of results) {
    const statusEmoji = result.overallStatus === "working"
      ? "✅"
      : result.overallStatus === "partial"
      ? "⚠️"
      : "❌";

    report += `### ${statusEmoji} ${result.modelId}\n\n`;
    report += `**Status:** ${result.overallStatus}\n\n`;

    // Basic response
    report += `**Basic response:**\n`;
    if (result.basicResponse.success) {
      report +=
        `- ✅ Success (${result.basicResponse.responseTime}ms)\n`;
      report += `- Response: "${result.basicResponse.content}"\n`;
    } else {
      report += `- ❌ Failed: ${result.basicResponse.error}\n`;
    }
    report += `\n`;

    // Tool support
    report += `**Tool support:**\n`;
    if (result.toolSupport.success && result.toolSupport.toolCalled) {
      report +=
        `- ✅ Success (${result.toolSupport.responseTime}ms)\n`;
      report += `- Tool called: ${result.toolSupport.toolName}\n`;
    } else if (result.toolSupport.success && !result.toolSupport.toolCalled) {
      report += `- ⚠️  Partial: ${result.toolSupport.error}\n`;
    } else {
      report += `- ❌ Failed: ${result.toolSupport.error}\n`;
    }
    report += `\n`;

    // Notes
    if (result.notes.length > 0) {
      report += `**Notes:**\n`;
      for (const note of result.notes) {
        report += `- ${note}\n`;
      }
      report += `\n`;
    }
  }

  return report;
}

/** Main function */
async function main(): Promise<void> {
  console.log("GitHub Copilot - New Claude Models Tester");
  console.log("==========================================\n");

  // Get auth token
  console.log("Getting GitHub auth token...");
  const token = await getGhToken();
  console.log("✅ Auth token obtained\n");

  // Models to test
  const modelsToTest = [
    "claude-haiku-4.5",
    "claude-opus-4.5",
  ];

  // Test each model
  const results: TestResult[] = [];
  for (let i = 0; i < modelsToTest.length; i++) {
    const modelId = modelsToTest[i];
    const result = await testModel(modelId, token);
    results.push(result);

    // Delay between models to avoid rate limits
    if (i < modelsToTest.length - 1) {
      console.log("\nWaiting 2 seconds before next test...");
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  // Generate report
  console.log("\n" + "=".repeat(60));
  console.log("FINAL SUMMARY");
  console.log("=".repeat(60));

  const report = generateReport(results);
  console.log("\n" + report);

  // Update test state
  await updateTestState(results);

  // Save report
  const reportPath = "./new-claude-models-test-report.md";
  await Deno.writeTextFile(reportPath, report);
  console.log(`✅ Report saved to ${reportPath}\n`);

  // Print summary
  const working = results.filter((r) => r.overallStatus === "working").length;
  const total = results.length;

  console.log(
    `\n✅ Testing complete: ${working}/${total} models working with full tool support`,
  );
}

if (import.meta.main) {
  main().catch((error) => {
    console.error("\n❌ Fatal error:", error.message);
    Deno.exit(1);
  });
}
