import { useEffect, useState } from "react";
import { MessageSquare, Paperclip, Send, X } from "lucide-react";
import { useSearchParams } from "react-router";
import { fetchConversation, fetchConversations, markConversationRead, sendConversationMessage, type ConversationDetail, type ConversationSummary } from "../../api/account";
import { useToast } from "../../components/ToastProvider";

export default function MessagingPage() {
  const { showToast } = useToast();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [searchParams] = useSearchParams();

  const loadInbox = async () => {
    try { setConversations((await fetchConversations()).data); }
    catch (error) { showToast({ kind: "error", title: "Messages unavailable", error, errorContext: "messaging" }); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadInbox(); }, []);

  useEffect(() => {
    const requestedId = Number(searchParams.get("conversation"));
    const requested = conversations.find((conversation) => conversation.id === requestedId);
    if (requested && selected?.id !== requested.id) void openConversation(requested);
  }, [conversations, searchParams]);

  const openConversation = async (conversation: ConversationSummary) => {
    setLoadingThread(true);
    try {
      const response = await fetchConversation(conversation.id);
      setSelected(response.data);
      if (conversation.unread_count > 0) {
        await markConversationRead(conversation.id);
        setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, unread_count: 0 } : item));
      }
    } catch (error) { showToast({ kind: "error", title: "Conversation unavailable", error, errorContext: "messaging" }); }
    finally { setLoadingThread(false); }
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || (!body.trim() && attachments.length === 0) || sending) return;
    setSending(true);
    try {
      const response = await sendConversationMessage(selected.id, body.trim(), attachments);
      setSelected({ ...selected, messages: [...selected.messages, response.data], last_message_preview: response.data.body, last_message_at: response.data.sent_at });
      setBody("");
      setAttachments([]);
      await loadInbox();
      showToast({ title: "Message sent" });
    } catch (error) { showToast({ kind: "error", title: "Message not sent", error, errorContext: "messaging" }); }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 md:px-8 lg:px-12">
      <div className="mb-5 flex items-end justify-between"><div><h1 className="font-[var(--font-display)] text-2xl">Messages</h1><p className="mt-1 text-sm text-[var(--color-ink-muted)]">Your private conversations are loaded from Maketo.</p></div><span className="text-xs text-[var(--color-ink-muted)]">{loading ? "Loading..." : `${conversations.length} conversations`}</span></div>
      <div className="grid min-h-[520px] overflow-hidden rounded-sm border border-[var(--color-border)] bg-white md:grid-cols-[320px_1fr]">
        <aside className={`border-r border-[var(--color-border)] ${selected ? "hidden md:block" : "block"}`}>
          {loading ? <p className="p-6 text-sm text-[var(--color-ink-muted)]">Loading conversations...</p> : conversations.length === 0 ? <div className="p-10 text-center"><MessageSquare className="mx-auto mb-3 text-[var(--color-ink-muted)]" size={24} /><p className="text-sm text-[var(--color-ink-muted)]">No conversations yet.</p></div> : conversations.map((conversation) => <button key={conversation.id} onClick={() => void openConversation(conversation)} className={`w-full border-b border-[var(--color-border-subtle)] p-4 text-left hover:bg-[var(--color-surface)] ${selected?.id === conversation.id ? "bg-[var(--color-navy-surface)]" : ""}`}><div className="flex justify-between gap-3"><p className="truncate text-sm font-[600]">{conversation.participant?.name ?? conversation.subject ?? "Conversation"}</p>{conversation.unread_count > 0 && <span className="rounded-full bg-[var(--color-red)] px-2 py-0.5 text-[10px] text-white">{conversation.unread_count}</span>}</div><p className="mt-1 truncate text-xs text-[var(--color-ink-muted)]">{conversation.last_message_preview ?? "No messages yet"}</p>{conversation.order_number && <p className="mt-1 text-[10px] text-[var(--color-ink-muted)]">Order {conversation.order_number}</p>}</button>)}
        </aside>
        <section className={`${selected ? "flex" : "hidden md:flex"} min-w-0 flex-col`}>
          {!selected ? <div className="flex flex-1 items-center justify-center p-8 text-center"><div><MessageSquare className="mx-auto mb-3 text-[var(--color-ink-muted)]" /><p className="text-sm text-[var(--color-ink-muted)]">Select a conversation to view its messages.</p></div></div> : <>
            <header className="flex items-center gap-3 border-b border-[var(--color-border)] p-4"><button onClick={() => setSelected(null)} className="text-xs text-[var(--color-navy)] md:hidden">Back</button><div><p className="text-sm font-[600]">{selected.participant?.name ?? selected.subject}</p>{selected.order_number && <p className="text-xs text-[var(--color-ink-muted)]">Order {selected.order_number}</p>}</div></header>
            <div className="flex-1 space-y-3 overflow-y-auto bg-[var(--color-surface)] p-4">{loadingThread ? <p className="text-sm text-[var(--color-ink-muted)]">Loading messages...</p> : selected.messages.length === 0 ? <p className="text-center text-sm text-[var(--color-ink-muted)]">No messages yet. Start the conversation below.</p> : selected.messages.map((message) => <div key={message.id} className={`flex ${message.is_mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[80%] rounded-sm px-4 py-2.5 text-sm ${message.is_mine ? "bg-[var(--color-navy)] text-white" : "border border-[var(--color-border)] bg-white text-[var(--color-ink)]"}`}><p className="whitespace-pre-wrap break-words">{message.body}</p>{message.attachments?.map((attachment) => <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className={`mt-2 block truncate text-xs underline ${message.is_mine ? "text-white" : "text-[var(--color-navy)]"}`}>{attachment.name}</a>)}<p className={`mt-1 text-[10px] ${message.is_mine ? "text-white/70" : "text-[var(--color-ink-muted)]"}`}>{message.sent_at ? new Date(message.sent_at).toLocaleString() : "Sending"}</p></div></div>)}</div>
            <form onSubmit={send} className="border-t border-[var(--color-border)] p-4">{attachments.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{attachments.map((file, index) => <span key={`${file.name}-${index}`} className="inline-flex max-w-[220px] items-center gap-1 rounded bg-[var(--color-surface)] px-2 py-1 text-xs"><span className="truncate">{file.name}</span><button type="button" onClick={() => setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={12} /></button></span>)}</div>}<div className="flex gap-2"><label className="flex w-11 cursor-pointer items-center justify-center rounded-sm border border-[var(--color-border)] text-[var(--color-ink-muted)] hover:text-[var(--color-navy)]"><Paperclip size={17} /><input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf,text/plain" className="hidden" onChange={(event) => setAttachments(Array.from(event.target.files ?? []).slice(0, 5))} /></label><textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={2} placeholder="Write a message..." className="min-w-0 flex-1 resize-none rounded-sm border border-[var(--color-border)] px-3 py-2 text-sm outline-none focus:border-[var(--color-navy)]" /><button disabled={sending || (!body.trim() && attachments.length === 0)} aria-label="Send message" className="flex w-11 items-center justify-center rounded-sm bg-[var(--color-navy)] text-white disabled:opacity-50"><Send size={17} /></button></div></form>
          </>}
        </section>
      </div>
    </div>
  );
}
