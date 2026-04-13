export const type = "openrouter_local";
export const label = "OpenRouter";
export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-4o-mini";
export const OPENROUTER_API_BASE = "https://openrouter.ai/api/v1";

export const models = [
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4.1", label: "GPT-4.1" },
  { id: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
  { id: "openai/o3", label: "o3" },
  { id: "openai/o4-mini", label: "o4 Mini" },
  { id: "anthropic/claude-opus-4-5", label: "Claude Opus 4.5" },
  { id: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-haiku-3-5", label: "Claude Haiku 3.5" },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
  { id: "meta-llama/llama-4-scout", label: "Llama 4 Scout" },
  { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  { id: "deepseek/deepseek-chat-v3-0324", label: "DeepSeek V3" },
  { id: "mistralai/mistral-large-2411", label: "Mistral Large" },
  { id: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
];

export const agentConfigurationDoc = `# openrouter_local agent configuration

Adapter: openrouter_local

Use when:
- You want access to hundreds of AI models (OpenAI, Anthropic, Google, Meta, etc.) via a single API key
- You want to switch models without redeploying
- You do not want to manage separate API keys for each provider

Don't use when:
- You need a local CLI-based agent with tool use and file access (use gemini_local, claude_local, codex_local)
- You need session resumption across heartbeats

Core fields:
- model (string, required): OpenRouter model ID in provider/model format (e.g. openai/gpt-4o-mini)
- apiKey (string, optional): OPENROUTER_API_KEY override; falls back to server environment variable
- promptTemplate (string, optional): run prompt template
- systemPrompt (string, optional): system message prepended to every request
- maxTokens (number, optional): maximum output tokens (default: 4096)
- temperature (number, optional): sampling temperature 0.0-2.0 (default: 0.7)
- baseUrl (string, optional): override OpenRouter API base URL

Operational fields:
- timeoutSec (number, optional): request timeout in seconds (default: 120)
`;
