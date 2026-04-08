import { AssistantPanel } from "@/components/assistant/assistant-panel";

export default function ChatPage() {
  return (
    <main className="flex flex-1 bg-transparent">
      <div className="flex min-h-[100svh] w-full flex-col">
        <div className="flex-1">
          <AssistantPanel standalone />
        </div>
      </div>
    </main>
  );
}
