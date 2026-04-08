export type AssistantSkillId = "tester-onboarding";

export type TesterListingsBucket = "1-5" | "6-10" | "11-30" | "31-100" | "100+";
export type TesterPainPoint =
  | "slow_replies"
  | "missed_messages"
  | "team_overload"
  | "scaling_operations"
  | "just_exploring";
export type TesterReadiness = "weekly" | "sometimes" | "maybe" | "not_really";
export type TesterHostifyActivity = "daily" | "weekly" | "rarely";

export type TesterOnboardingDecision = "accepted" | "waitlist" | "not_fit";

export type TesterOnboardingAnswers = {
  listingsBucket?: TesterListingsBucket | null;
  painPoint?: TesterPainPoint | null;
  readiness?: TesterReadiness | null;
  hostifyActivity?: TesterHostifyActivity | null;
};

export type TesterOnboardingState =
  | "welcome"
  | "listings"
  | "pain"
  | "activity"
  | "readiness"
  | "decision"
  | "auth"
  | "account_setup"
  | "completed";

export type AssistantConversationContext = {
  version: 1;
  skillId: AssistantSkillId;
  state: TesterOnboardingState;
  answers: TesterOnboardingAnswers;
  score: number;
  decision: TesterOnboardingDecision | null;
  authenticated: boolean;
  onboardingAccountSaved: boolean;
  sessionDisplayName?: string | null;
};

export type QuickReply = {
  id: string;
  label: string;
  message: string;
};

export type NavigationAction = {
  id: string;
  label: string;
  route: string;
};

export type AssistantCard =
  | {
      type: "quick_replies";
      title?: string;
      replies: QuickReply[];
    }
  | {
      type: "auth";
      title?: string;
      description?: string;
    }
  | {
      type: "account_setup";
      title?: string;
      description?: string;
      defaults?: {
        telegramChatId?: string | null;
        mode?: "draft" | "autopilot";
      };
    }
  | {
      type: "decision";
      decision: TesterOnboardingDecision;
      title: string;
      description: string;
    }
  | {
      type: "navigation";
      title?: string;
      actions: NavigationAction[];
    };

export type AssistantTurnResponse = {
  context: AssistantConversationContext;
  assistantText: string;
  cards: AssistantCard[];
  openRoute?: string | null;
};

export type AssistantUserMessageRequest = {
  context?: AssistantConversationContext | null;
  message: string;
  authenticated: boolean;
  tenant?: {
    hasTenant?: boolean;
    hasHostifyBinding?: boolean;
    hasHostifyKey?: boolean;
    hostifyCustomerId?: string | null;
    telegramChatId?: string | null;
  } | null;
  assistantContext?: {
    userEmail?: string | null;
    tenantId?: string | null;
    hostifyCustomerId?: string | null;
    hostifyCustomerName?: string | null;
    hostifyIntegration?: string | null;
    hasHostifyKey?: boolean;
    hasGlobalInstructions?: boolean;
    activeListings?: number;
    totalListings?: number;
    runtimeUnresolved?: number;
    mode?: "draft" | "autopilot" | null;
  } | null;
};
