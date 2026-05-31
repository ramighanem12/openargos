(function defineOpenArgosModelCatalog(root, factory) {
  const catalog = factory();
  if (typeof module === "object" && module.exports) module.exports = catalog;
  if (root) root.OpenArgosModelCatalog = catalog;
})(typeof globalThis !== "undefined" ? globalThis : this, function createOpenArgosModelCatalog() {
  const providers = {
    openai: {
      label: "OpenAI",
      keyPlaceholder: "OpenAI API key"
    },
    anthropic: {
      label: "Anthropic",
      keyPlaceholder: "Anthropic API key"
    },
    openrouter: {
      label: "OpenRouter",
      keyPlaceholder: "OpenRouter API key"
    },
    gemini: {
      label: "Gemini",
      keyPlaceholder: "Gemini API key"
    },
    xai: {
      label: "xAI",
      keyPlaceholder: "xAI API key"
    },
    groq: {
      label: "Groq",
      keyPlaceholder: "Groq API key"
    }
  };

  const models = {
    "gpt-5.5": { provider: "openai", label: "GPT-5.5", apiModel: "gpt-5.5", computerUse: true },
    "gpt-5.4": { provider: "openai", label: "GPT-5.4", apiModel: "gpt-5.4" },
    "gpt-5.4-mini": { provider: "openai", label: "GPT-5.4 Mini", apiModel: "gpt-5.4-mini" },
    "gpt-5.4-nano": { provider: "openai", label: "GPT-5.4 Nano", apiModel: "gpt-5.4-nano" },
    "claude-opus-4-8": { provider: "anthropic", label: "Claude Opus 4.8", apiModel: "claude-opus-4-8" },
    "claude-sonnet-4-6": { provider: "anthropic", label: "Claude Sonnet 4.6", apiModel: "claude-sonnet-4-6" },
    "claude-haiku-4-5-20251001": { provider: "anthropic", label: "Claude Haiku 4.5", apiModel: "claude-haiku-4-5-20251001" },
    "openrouter-auto": { provider: "openrouter", label: "OpenRouter (Auto)", apiModel: "openrouter/auto" },
    "openrouter-free": { provider: "openrouter", label: "OpenRouter (Free)", apiModel: "openrouter/free" },
    "gemini-3-pro-preview": { provider: "gemini", label: "Gemini 3 Pro Preview", apiModel: "gemini-3-pro-preview" },
    "gemini-3-flash-preview": { provider: "gemini", label: "Gemini 3 Flash Preview", apiModel: "gemini-3-flash-preview" },
    "gemini-2.5-pro": { provider: "gemini", label: "Gemini 2.5 Pro", apiModel: "gemini-2.5-pro" },
    "gemini-2.5-flash": { provider: "gemini", label: "Gemini 2.5 Flash", apiModel: "gemini-2.5-flash" },
    "gemini-2.5-flash-lite": { provider: "gemini", label: "Gemini 2.5 Flash-Lite", apiModel: "gemini-2.5-flash-lite" },
    "xai-grok-4-3": { provider: "xai", label: "Grok 4.3", apiModel: "grok-4.3" }
  };

  const defaultModelByProvider = {
    openai: "gpt-5.5",
    anthropic: "claude-sonnet-4-6",
    openrouter: "openrouter-auto",
    gemini: "gemini-3-flash-preview",
    xai: "xai-grok-4-3"
  };

  const modelAliases = {
    auto: "openrouter-auto",
    "gpt-instant": "gpt-5.4-nano",
    "gpt-5.2": "gpt-5.5",
    "gpt-5.2-pro": "gpt-5.5",
    "gpt-5.2-chat-latest": "gpt-5.4",
    "gpt-5-mini": "gpt-5.4-mini",
    "gpt-5-nano": "gpt-5.4-nano",
    "claude-opus-4-1-20250805": "claude-opus-4-8",
    "claude-sonnet-4-20250514": "claude-sonnet-4-6",
    "claude-3-5-haiku-20241022": "claude-haiku-4-5-20251001",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
    "gemini-3.1-pro-preview": "gemini-3-pro-preview",
    "gemini-3.5-flash": "gemini-3-flash-preview",
    "gemini-3.1-flash-lite": "gemini-2.5-flash-lite",
    "openrouter-gpt-5-5": "openrouter-auto",
    "openrouter-claude-sonnet": "openrouter-auto"
  };

  const providerOrder = ["openai", "anthropic", "openrouter", "gemini", "xai"];
  const externalModelKeyProviders = [...providerOrder, "groq"];

  return {
    providers,
    models,
    defaultModelByProvider,
    modelAliases,
    providerOrder,
    externalModelKeyProviders
  };
});
