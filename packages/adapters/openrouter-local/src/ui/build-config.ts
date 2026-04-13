import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { DEFAULT_OPENROUTER_MODEL } from "../index.js";

export function buildOpenRouterLocalConfig(v: CreateConfigValues): Record<string, unknown> {
  const ac: Record<string, unknown> = {};
  ac.model = v.model || DEFAULT_OPENROUTER_MODEL;
  if (v.promptTemplate) ac.promptTemplate = v.promptTemplate;
  if (v.cwd) ac.cwd = v.cwd;
  ac.timeoutSec = 120;
  ac.maxTokens = 4096;
  ac.temperature = 0.7;

  if (v.envVars) {
    const env: Record<string, string> = {};
    for (const line of v.envVars.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1);
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) env[key] = value;
    }
    if (Object.keys(env).length > 0) ac.env = env;
  }

  return ac;
}
