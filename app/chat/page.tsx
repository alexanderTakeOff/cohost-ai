import { AssistantPanel } from "@/components/assistant/assistant-panel";

export default function ChatPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-0 dark:bg-black">
      <div className="flex h-[100dvh] w-full max-w-5xl flex-col">
        <div className="border-b border-black/10 bg-white px-4 py-3 text-sm dark:border-white/15 dark:bg-black">
          <p className="font-medium">Jenny</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Conversational onboarding and product guide
          </p>
        </div>
        <div className="flex-1">
          <AssistantPanel standalone />
        </div>
      </div>
    </main>
  );
}
