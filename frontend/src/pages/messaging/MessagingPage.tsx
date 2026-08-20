import { useEffect, useState } from "react";
import { fetchBuyerMessages } from "../../api/buyer";

type Perspective = "buyer" | "seller";

export const CONVOS: Array<{ participants: Array<{ type: "buyer" | "seller" }>; unread: number }> = [];

interface MessagingPageProps {
  perspective?: Perspective;
  showError?: boolean;
}

export default function MessagingPage({ perspective = "buyer", showError = false }: MessagingPageProps) {
  const [loading, setLoading] = useState(true);
  const [conversationCount, setConversationCount] = useState(0);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const response = await fetchBuyerMessages();
        if (!active) return;
        setConversationCount(response.data.length);
      } catch {
        if (!active) return;
        setConversationCount(0);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex h-full bg-[var(--color-ground)] overflow-hidden">
      <div className="w-full md:w-80 xl:w-96 shrink-0 bg-white border-r border-[var(--color-border)] flex flex-col">
        <div className="px-4 pt-5 pb-3 border-b border-[var(--color-border)]">
          <h1 className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)]">Messages</h1>
          <p className="font-[var(--font-mono)] text-[10px] text-[var(--color-ink-muted)] mt-1">
            {loading ? "Loading..." : `${conversationCount} conversation${conversationCount === 1 ? "" : "s"} from the backend`}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[var(--color-ink-muted)]">
              {showError
                ? "There was a problem loading messages."
                : conversationCount === 0
                  ? "No conversations yet. Messages will appear here once the backend returns inbox records."
                  : "Conversation records are available, but this inbox view is still backend-first and intentionally does not fabricate chat history."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex items-center justify-center p-8 text-center">
        <div className="max-w-md">
          <p className="font-[var(--font-display)] text-xl font-[400] text-[var(--color-ink)] mb-2">Select a conversation</p>
          <p className="text-sm text-[var(--color-ink-muted)]">
            {perspective === "buyer"
              ? "Buyer messaging is connected to the backend, but no conversation content is being mocked here."
              : "Seller messaging uses the same backend inbox source."}
          </p>
        </div>
      </div>
    </div>
  );
}
