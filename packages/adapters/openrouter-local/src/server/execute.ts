import type { AdapterExecutionContext, AdapterExecutionResult } from "@paperclipai/adapter-utils";
import { asString, asNumber, parseObject } from "@paperclipai/adapter-utils/server-utils";
import { DEFAULT_OPENROUTER_MODEL, OPENROUTER_API_BASE } from "../index.js";

interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

function renderTemplate(template: string, data: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    const parts = trimmed.split(".");
    let value: unknown = data;
    for (const part of parts) {
      if (typeof value === "object" && value !== null) {
        value = (value as Record<string, unknown>)[part];
      } else {
        value = undefined;
        break;
      }
    }
    return value != null ? String(value) : "";
  });
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, config, context, onLog } = ctx;

  const configObj = parseObject(config);
  const model = asString(configObj.model, DEFAULT_OPENROUTER_MODEL).trim();
  const baseUrl = asString(configObj.baseUrl, OPENROUTER_API_BASE).replace(/\/$/, "");
  const timeoutSec = asNumber(configObj.timeoutSec, 120);
  const maxTokens = asNumber(configObj.maxTokens, 4096);
  const temperature = asNumber(configObj.temperature, 0.7);

  const envConfig = parseObject(configObj.env);
  const configApiKey = asString(configObj.apiKey, "").trim() || asString(envConfig.OPENROUTER_API_KEY, "").trim();
  const apiKey = configApiKey || process.env.OPENROUTER_API_KEY || "";

  if (!apiKey) {
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: "No OPENROUTER_API_KEY configured. Set it in the adapter env or as a server environment variable.",
    };
  }

  const promptTemplate = asString(
    configObj.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work.",
  );
  const systemPrompt = asString(configObj.systemPrompt, "").trim();

  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };

  const wakeReason = typeof context.wakeReason === "string" ? context.wakeReason.trim() : "";
  const taskId =
    (typeof context.taskId === "string" && context.taskId.trim()) ||
    (typeof context.issueId === "string" && context.issueId.trim()) ||
    null;

  const paperclipContext = [
    taskId ? `Current task: ${taskId}` : "",
    wakeReason ? `Wake reason: ${wakeReason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt =
    [paperclipContext, renderTemplate(promptTemplate, templateData)]
      .filter(Boolean)
      .join("\n\n");

  const messages: OpenRouterMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  await onLog("stdout", `[paperclip] OpenRouter request: model=${model} maxTokens=${maxTokens}\n`);

  const controller = new AbortController();
  const timeoutHandle = timeoutSec > 0
    ? setTimeout(() => controller.abort(), timeoutSec * 1000)
    : null;

  let responseText = "";
  let inputTokens = 0;
  let outputTokens = 0;
  let usedModel = model;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://paperclip.ai",
        "X-Title": "Paperclip",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: controller.signal,
    });

    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const errorMessage = `OpenRouter API error ${response.status}: ${errorBody.slice(0, 400)}`;
      await onLog("stderr", `[paperclip] ${errorMessage}\n`);
      return {
        exitCode: 1,
        signal: null,
        timedOut: false,
        errorMessage,
      };
    }

    const data = (await response.json()) as OpenRouterResponse;
    responseText = data.choices?.[0]?.message?.content ?? "";
    inputTokens = data.usage?.prompt_tokens ?? 0;
    outputTokens = data.usage?.completion_tokens ?? 0;
    usedModel = data.model ?? model;

    await onLog("stdout", `${responseText}\n`);
    await onLog(
      "stdout",
      `[paperclip] OpenRouter done: model=${usedModel} in=${inputTokens} out=${outputTokens}\n`,
    );
  } catch (err) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        exitCode: null,
        signal: null,
        timedOut: true,
        errorMessage: `OpenRouter request timed out after ${timeoutSec}s`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    await onLog("stderr", `[paperclip] OpenRouter fetch error: ${message}\n`);
    return {
      exitCode: 1,
      signal: null,
      timedOut: false,
      errorMessage: `OpenRouter fetch error: ${message}`,
    };
  }

  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    errorMessage: null,
    usage: { inputTokens, outputTokens, cachedInputTokens: 0 },
    provider: "openrouter",
    biller: "openrouter",
    model: usedModel,
    summary: responseText.slice(0, 500),
  };
}
