import { detectNavigationIntent } from "@/lib/ai/navigation";
import { runTesterOnboardingSkill } from "@/lib/ai/skills/tester-onboarding";
import type {
  AssistantTurnResponse,
  AssistantUserMessageRequest,
} from "@/lib/ai/types";

export async function runAssistantTurn(
  input: AssistantUserMessageRequest,
): Promise<AssistantTurnResponse> {
  const navigationRoute = detectNavigationIntent(input.message);
  if (navigationRoute) {
    const response = await runTesterOnboardingSkill(input);
    return {
      ...response,
      assistantText: "Sure — I’m opening that now.",
      openRoute: navigationRoute,
      cards: [],
    };
  }

  return runTesterOnboardingSkill(input);
}
