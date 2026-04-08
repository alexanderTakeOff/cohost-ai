export function getAiEnv() {
  return {
    provider: process.env.AI_PROVIDER?.trim().toLowerCase() || "openai",
    model: process.env.AI_MODEL?.trim() || "gpt-4.1-mini",
    openAiApiKey: process.env.OPENAI_API_KEY?.trim() || "",
  };
}

export function hasAiProviderConfigured() {
  const env = getAiEnv();
  if (env.provider === "openai") {
    return Boolean(env.openAiApiKey);
  }
  return false;
}
