export function detectNavigationIntent(message: string) {
  const normalized = message.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const intents = [
    {
      route: "/dashboard",
      matches: ["dashboard", "open dashboard", "go to dashboard", "дашборд", "открой дашборд"],
    },
    {
      route: "/onboarding?tab=account",
      matches: ["account tab", "open account", "onboarding account", "аккаунт", "открой аккаунт"],
    },
    {
      route: "/onboarding?tab=listings",
      matches: ["listings", "open listings", "listing tab", "листинги", "открой листинги"],
    },
    {
      route: "/onboarding?tab=assistant",
      matches: ["assistant tab", "open assistant", "инструкции", "ассистент"],
    },
    {
      route: "/onboarding?tab=economics",
      matches: ["economics", "open economics", "экономика", "открой экономику"],
    },
    {
      route: "/onboarding",
      matches: ["onboarding", "open onboarding", "setup", "настройки", "онбординг"],
    },
  ] as const;

  for (const intent of intents) {
    if (intent.matches.some((match) => normalized.includes(match))) {
      return intent.route;
    }
  }

  return null;
}
