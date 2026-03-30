export function hasN8nEnv() {
  return Boolean(process.env.N8N_WEBHOOK_URL && process.env.N8N_WEBHOOK_SECRET);
}

export function getN8nEnv() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    throw new Error("Missing N8N_WEBHOOK_URL or N8N_WEBHOOK_SECRET environment variables.");
  }

  return { webhookUrl, webhookSecret };
}
