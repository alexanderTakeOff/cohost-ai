import { generateAiJson, generateAiText } from "@/lib/ai/provider";
import type {
  AssistantCard,
  AssistantConversationContext,
  AssistantTurnResponse,
  AssistantUserMessageRequest,
  TesterHostifyActivity,
  TesterListingsBucket,
  TesterOnboardingDecision,
  TesterPainPoint,
  TesterReadiness,
} from "@/lib/ai/types";

function quickReplies(title: string, replies: Array<{ id: string; label: string; message: string }>): AssistantCard {
  return {
    type: "quick_replies",
    title,
    replies,
  };
}

function navigationCard(actions: Array<{ id: string; label: string; route: string }>): AssistantCard {
  return {
    type: "navigation",
    title: "Open a page",
    actions,
  };
}

export function createInitialAssistantContext(
  authenticated: boolean,
): AssistantConversationContext {
  return {
    version: 1,
    skillId: "tester-onboarding",
    state: "welcome",
    answers: {},
    score: 0,
    decision: null,
    authenticated,
    onboardingAccountSaved: false,
  };
}

function scoreListings(value: TesterListingsBucket | null | undefined) {
  switch (value) {
    case "6-10":
      return 2;
    case "11-30":
      return 4;
    case "31-100":
      return 5;
    case "100+":
      return 3;
    default:
      return 0;
  }
}

function scorePain(value: TesterPainPoint | null | undefined) {
  switch (value) {
    case "slow_replies":
      return 3;
    case "missed_messages":
      return 4;
    case "team_overload":
      return 4;
    case "scaling_operations":
      return 3;
    default:
      return 0;
  }
}

function scoreActivity(value: TesterHostifyActivity | null | undefined) {
  switch (value) {
    case "daily":
      return 3;
    case "weekly":
      return 1;
    case "rarely":
      return -1;
    default:
      return 0;
  }
}

function scoreReadiness(value: TesterReadiness | null | undefined) {
  switch (value) {
    case "weekly":
      return 4;
    case "sometimes":
      return 2;
    case "maybe":
      return 0;
    case "not_really":
      return -3;
    default:
      return 0;
  }
}

function evaluateDecision(context: AssistantConversationContext): TesterOnboardingDecision {
  const total =
    scoreListings(context.answers.listingsBucket) +
    scorePain(context.answers.painPoint) +
    scoreActivity(context.answers.hostifyActivity) +
    scoreReadiness(context.answers.readiness);

  context.score = total;

  if (context.answers.readiness === "not_really") {
    return "not_fit";
  }

  if (context.answers.painPoint === "just_exploring" && total < 8) {
    return "not_fit";
  }

  if (context.answers.listingsBucket === "1-5" && total < 9) {
    return "not_fit";
  }

  if (total >= 10) {
    return "accepted";
  }

  if (total >= 6) {
    return "waitlist";
  }

  return "not_fit";
}

async function renderAssistantCopy(fallbackText: string, userMessage?: string) {
  const generated = await generateAiText({
    system:
      "You are Jenny, a concise and friendly AI onboarding guide for Cohost AI closed beta. Rewrite the provided fallback response in 2-4 short sentences, keep it warm, concrete, and product-like. Do not add new facts. Keep button labels and routes out of the text.",
    user: `Fallback response:\n${fallbackText}\n\nLatest user message:\n${userMessage ?? ""}`,
  });

  return generated?.trim() || fallbackText;
}

type ClassificationResult<T> = {
  value: T | null;
};

async function classifyListings(message: string): Promise<TesterListingsBucket | null> {
  const generated = await generateAiJson<ClassificationResult<TesterListingsBucket>>({
    system:
      "Classify the user's Hostify listing count into one bucket. Return JSON only.",
    user:
      `User message: ${message}\nAllowed values: "1-5", "6-10", "11-30", "31-100", "100+"`,
    schemaName: "tester_listings_bucket",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          type: ["string", "null"],
          enum: ["1-5", "6-10", "11-30", "31-100", "100+", null],
        },
      },
      required: ["value"],
    },
  });

  if (generated?.value) {
    return generated.value;
  }

  const normalized = message.toLowerCase();
  const number = normalized.match(/\d+/)?.[0] ? Number(normalized.match(/\d+/)?.[0]) : null;
  if (number !== null) {
    if (number <= 5) return "1-5";
    if (number <= 10) return "6-10";
    if (number <= 30) return "11-30";
    if (number <= 100) return "31-100";
    return "100+";
  }

  if (normalized.includes("100")) return "100+";
  return null;
}

async function classifyPain(message: string): Promise<TesterPainPoint | null> {
  const generated = await generateAiJson<ClassificationResult<TesterPainPoint>>({
    system:
      "Classify the user's biggest operational pain into one value. Return JSON only.",
    user:
      `User message: ${message}\nAllowed values: "slow_replies", "missed_messages", "team_overload", "scaling_operations", "just_exploring"`,
    schemaName: "tester_pain_point",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          type: ["string", "null"],
          enum: [
            "slow_replies",
            "missed_messages",
            "team_overload",
            "scaling_operations",
            "just_exploring",
            null,
          ],
        },
      },
      required: ["value"],
    },
  });

  if (generated?.value) {
    return generated.value;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("miss") || normalized.includes("пропуск")) return "missed_messages";
  if (normalized.includes("slow") || normalized.includes("slow reply") || normalized.includes("медленно")) {
    return "slow_replies";
  }
  if (normalized.includes("team") || normalized.includes("overload") || normalized.includes("перегруз")) {
    return "team_overload";
  }
  if (normalized.includes("scale") || normalized.includes("growing") || normalized.includes("рост")) {
    return "scaling_operations";
  }
  if (normalized.includes("explor") || normalized.includes("интересно") || normalized.includes("посмотреть")) {
    return "just_exploring";
  }
  return null;
}

async function classifyActivity(message: string): Promise<TesterHostifyActivity | null> {
  const generated = await generateAiJson<ClassificationResult<TesterHostifyActivity>>({
    system:
      "Classify how actively the user works in Hostify. Return JSON only.",
    user: `User message: ${message}\nAllowed values: "daily", "weekly", "rarely"`,
    schemaName: "tester_hostify_activity",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          type: ["string", "null"],
          enum: ["daily", "weekly", "rarely", null],
        },
      },
      required: ["value"],
    },
  });

  if (generated?.value) {
    return generated.value;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("day") || normalized.includes("ежедн")) return "daily";
  if (normalized.includes("week") || normalized.includes("недел")) return "weekly";
  if (normalized.includes("rare") || normalized.includes("редко")) return "rarely";
  return null;
}

async function classifyReadiness(message: string): Promise<TesterReadiness | null> {
  const generated = await generateAiJson<ClassificationResult<TesterReadiness>>({
    system:
      "Classify how ready the user is to test and give feedback. Return JSON only.",
    user: `User message: ${message}\nAllowed values: "weekly", "sometimes", "maybe", "not_really"`,
    schemaName: "tester_readiness",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          type: ["string", "null"],
          enum: ["weekly", "sometimes", "maybe", "not_really", null],
        },
      },
      required: ["value"],
    },
  });

  if (generated?.value) {
    return generated.value;
  }

  const normalized = message.toLowerCase();
  if (normalized.includes("weekly") || normalized.includes("кажд")) return "weekly";
  if (normalized.includes("sometimes") || normalized.includes("иногда")) return "sometimes";
  if (normalized.includes("not") || normalized.includes("не особо")) return "not_really";
  if (normalized.includes("maybe") || normalized.includes("может")) return "maybe";
  return null;
}

function decisionCard(decision: TesterOnboardingDecision) {
  if (decision === "accepted") {
    return {
      type: "decision",
      decision,
      title: "You are a fit for the closed beta",
      description:
        "We can continue with access and account setup right away. Jenny will keep the flow short and practical.",
    } satisfies AssistantCard;
  }

  if (decision === "waitlist") {
    return {
      type: "decision",
      decision,
      title: "You are close, but this beta is selective",
      description:
        "Jenny can keep you on a priority waitlist while we onboard a small number of high-intensity operators first.",
    } satisfies AssistantCard;
  }

  return {
    type: "decision",
    decision,
    title: "This beta is probably not the best fit yet",
    description:
      "The current cohort is optimized for operators with sharper messaging pain and stronger weekly testing commitment.",
  } satisfies AssistantCard;
}

function getPromptCards(context: AssistantConversationContext): AssistantCard[] {
  switch (context.state) {
    case "welcome":
      return [
        quickReplies("Would you like to explore the private beta fit?", [
          { id: "continue", label: "Continue", message: "Continue" },
          { id: "not-for-me", label: "Not for me", message: "Not for me" },
        ]),
      ];
    case "listings":
      return [
        quickReplies("How many active listings do you manage in Hostify today?", [
          { id: "l-1-5", label: "1-5", message: "We manage 1-5 listings." },
          { id: "l-6-10", label: "6-10", message: "We manage 6-10 listings." },
          { id: "l-11-30", label: "11-30", message: "We manage 11-30 listings." },
          { id: "l-31-100", label: "31-100", message: "We manage 31-100 listings." },
          { id: "l-100plus", label: "100+", message: "We manage 100+ listings." },
        ]),
      ];
    case "pain":
      return [
        quickReplies("What hurts most in guest communication today?", [
          { id: "p-slow", label: "Slow replies", message: "Slow replies are the main pain." },
          { id: "p-missed", label: "Missed messages", message: "Missed guest messages are the main pain." },
          { id: "p-team", label: "Team overload", message: "Team overload is the main pain." },
          { id: "p-scale", label: "Scaling operations", message: "Scaling operations is the main pain." },
          { id: "p-explore", label: "Just exploring", message: "We are mostly just exploring for now." },
        ]),
      ];
    case "activity":
      return [
        quickReplies("How actively does your team work in Hostify?", [
          { id: "a-daily", label: "Daily", message: "We use Hostify daily." },
          { id: "a-weekly", label: "Weekly", message: "We use Hostify weekly." },
          { id: "a-rarely", label: "Rarely", message: "We use Hostify rarely." },
        ]),
      ];
    case "readiness":
      return [
        quickReplies("How ready are you to test and give feedback?", [
          { id: "r-weekly", label: "Weekly", message: "We can give weekly feedback." },
          { id: "r-sometimes", label: "Sometimes", message: "We can give feedback sometimes." },
          { id: "r-maybe", label: "Maybe", message: "Maybe, depending on time." },
          { id: "r-not", label: "Not really", message: "We are not really ready for active testing." },
        ]),
      ];
    default:
      return [];
  }
}

function buildPostDecisionCards(context: AssistantConversationContext, tenant?: { telegramChatId?: string | null } | null) {
  if (context.state === "auth" && !context.authenticated) {
    return [
      decisionCard(context.decision ?? "waitlist"),
      {
        type: "auth",
        title: "Create or use your Cohost AI account",
        description:
          "Once you sign in, Jenny will keep going inside the same conversation and prepare the account setup card.",
      } satisfies AssistantCard,
    ];
  }

  if (context.state === "account_setup") {
    return [
      decisionCard("accepted"),
      {
        type: "account_setup",
        title: "Account setup in chat",
        description:
          "Paste your Hostify API key, confirm your Telegram chat, and choose a mode. Jenny will save the account settings without leaving the conversation.",
        defaults: {
          telegramChatId: tenant?.telegramChatId ?? "",
          mode: "draft",
        },
      } satisfies AssistantCard,
    ];
  }

  if (context.state === "completed") {
    return [
      decisionCard("accepted"),
      navigationCard([
        { id: "open-dashboard", label: "Open dashboard", route: "/dashboard" },
        { id: "open-account", label: "Open onboarding account", route: "/onboarding?tab=account" },
        { id: "open-listings", label: "Open onboarding listings", route: "/onboarding?tab=listings" },
        { id: "open-assistant", label: "Open assistant settings", route: "/onboarding?tab=assistant" },
      ]),
    ];
  }

  if (context.state === "decision") {
    return [decisionCard(context.decision ?? "waitlist")];
  }

  return [];
}

function cloneContext(context: AssistantConversationContext): AssistantConversationContext {
  return {
    ...context,
    answers: { ...context.answers },
  };
}

export async function runTesterOnboardingSkill(
  input: AssistantUserMessageRequest,
): Promise<AssistantTurnResponse> {
  const context = cloneContext(input.context ?? createInitialAssistantContext(input.authenticated));
  context.authenticated = input.authenticated;

  const normalized = input.message.trim();
  if (!normalized) {
    const cards = getPromptCards(context);
    const assistantText = await renderAssistantCopy(
      "Hi, I’m Jenny. I can qualify your fit for the private beta, then move you into account setup and onboarding without switching context.",
    );
    return {
      context,
      assistantText,
      cards,
      openRoute: null,
    };
  }

  if (context.state === "welcome") {
    if (/not for me|no|later|не надо|не сейчас/i.test(normalized)) {
      context.state = "decision";
      context.decision = "not_fit";
      const assistantText = await renderAssistantCopy(
        "No problem. This beta is intentionally selective, so it’s better to skip than to force a weak fit.",
        normalized,
      );
      return {
        context,
        assistantText,
        cards: [decisionCard("not_fit")],
        openRoute: null,
      };
    }

    context.state = "listings";
    return {
      context,
      assistantText: await renderAssistantCopy(
        "Great. I’ll keep this short and practical. First, how many active listings do you manage in Hostify today?",
        normalized,
      ),
      cards: getPromptCards(context),
      openRoute: null,
    };
  }

  if (context.state === "listings") {
    const bucket = await classifyListings(normalized);
    if (!bucket) {
      return {
        context,
        assistantText: await renderAssistantCopy(
          "I didn’t catch the listing range. Please answer with something like 6-10, 11-30, or 31-100.",
          normalized,
        ),
        cards: getPromptCards(context),
        openRoute: null,
      };
    }
    context.answers.listingsBucket = bucket;
    context.state = "pain";
    return {
      context,
      assistantText: await renderAssistantCopy(
        "Got it. What hurts most in guest communication today: slow replies, missed messages, team overload, or scaling operations?",
        normalized,
      ),
      cards: getPromptCards(context),
      openRoute: null,
    };
  }

  if (context.state === "pain") {
    const pain = await classifyPain(normalized);
    if (!pain) {
      return {
        context,
        assistantText: await renderAssistantCopy(
          "Please pick the closest pain point so I can score the fit correctly.",
          normalized,
        ),
        cards: getPromptCards(context),
        openRoute: null,
      };
    }
    context.answers.painPoint = pain;
    context.state = "activity";
    return {
      context,
      assistantText: await renderAssistantCopy(
        "Thanks. How actively does your team work in Hostify: daily, weekly, or only occasionally?",
        normalized,
      ),
      cards: getPromptCards(context),
      openRoute: null,
    };
  }

  if (context.state === "activity") {
    const activity = await classifyActivity(normalized);
    if (!activity) {
      return {
        context,
        assistantText: await renderAssistantCopy(
          "Please choose daily, weekly, or rarely so I can understand whether the pain is active enough for this beta.",
          normalized,
        ),
        cards: getPromptCards(context),
        openRoute: null,
      };
    }
    context.answers.hostifyActivity = activity;
    context.state = "readiness";
    return {
      context,
      assistantText: await renderAssistantCopy(
        "Last fit question: how ready are you to test and give feedback weekly, sometimes, maybe, or not really?",
        normalized,
      ),
      cards: getPromptCards(context),
      openRoute: null,
    };
  }

  if (context.state === "readiness") {
    const readiness = await classifyReadiness(normalized);
    if (!readiness) {
      return {
        context,
        assistantText: await renderAssistantCopy(
          "Please choose one of the readiness options so I can finish the fit decision.",
          normalized,
        ),
        cards: getPromptCards(context),
        openRoute: null,
      };
    }

    context.answers.readiness = readiness;
    context.decision = evaluateDecision(context);

    if (context.decision === "accepted") {
      context.state = context.authenticated ? "account_setup" : "auth";
      return {
        context,
        assistantText: await renderAssistantCopy(
          context.authenticated
            ? "You look like a strong fit. Let’s move directly into account setup here in chat."
            : "You look like a strong fit for the closed beta. The next step is to create or use your Cohost AI account right here in the chat.",
          normalized,
        ),
        cards: buildPostDecisionCards(context, input.tenant),
        openRoute: null,
      };
    }

    context.state = "decision";
    return {
      context,
      assistantText: await renderAssistantCopy(
        context.decision === "waitlist"
          ? "You’re close, but this beta is optimized for a very small first cohort. I’ll keep you in the priority waitlist lane."
          : "I don’t think this cohort is the right fit yet. I’d rather be honest now than waste your time with a weak match.",
        normalized,
      ),
      cards: buildPostDecisionCards(context, input.tenant),
      openRoute: null,
    };
  }

  if (context.state === "auth") {
    if (!context.authenticated) {
      return {
        context,
        assistantText: await renderAssistantCopy(
          "As soon as you sign in or create an account, I’ll continue in the same conversation.",
          normalized,
        ),
        cards: buildPostDecisionCards(context, input.tenant),
        openRoute: null,
      };
    }

    context.state = "account_setup";
    return {
      context,
      assistantText: await renderAssistantCopy(
        "Perfect, you’re signed in. I’m opening the account setup card now.",
        normalized,
      ),
      cards: buildPostDecisionCards(context, input.tenant),
      openRoute: null,
    };
  }

  if (context.state === "account_setup") {
    if (context.onboardingAccountSaved) {
      context.state = "completed";
      return {
        context,
        assistantText: await renderAssistantCopy(
          "Your account settings are saved. You can open dashboard or any onboarding tab from here, and I’ll stay available as your conversational guide.",
          normalized,
        ),
        cards: buildPostDecisionCards(context, input.tenant),
        openRoute: null,
      };
    }

    return {
      context,
      assistantText: await renderAssistantCopy(
        "Use the account setup card below. Once it is saved, I’ll open the next step.",
        normalized,
      ),
      cards: buildPostDecisionCards(context, input.tenant),
      openRoute: null,
    };
  }

  if (context.state === "completed") {
    return {
      context,
      assistantText: await renderAssistantCopy(
        "I can open your dashboard or any onboarding tab. Tell me where you want to go, or use the buttons below.",
        normalized,
      ),
      cards: buildPostDecisionCards(context, input.tenant),
      openRoute: null,
    };
  }

  return {
    context,
    assistantText: await renderAssistantCopy(
      "I’m keeping the beta flow structured. Let’s continue with the next guided step.",
      normalized,
    ),
    cards: getPromptCards(context),
    openRoute: null,
  };
}
