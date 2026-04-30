import { Bot, Send, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import type { AssistantMessage } from '../types/shop';
import { ProductCard } from './ProductCard';

const quickReplies = [
  'Find me wireless headphones under $150',
  'Gift ideas for mom',
  'Compare running shoes',
  'Track my order'
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    const saved = sessionStorage.getItem('shopmind-assistant');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Hi, I am ShopMind. Tell me a budget, recipient, product, or problem and I will narrow the shelf.'
          }
        ];
  });
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sessionStorage.setItem('shopmind-assistant', JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendMessage(text = input) {
    if (!text.trim() || streaming) return;
    const userMessage: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const assistantId = crypto.randomUUID();
    const pendingAssistant: AssistantMessage = { id: assistantId, role: 'assistant', content: '' };
    const nextMessages = [...messages, userMessage, pendingAssistant];
    setMessages(nextMessages);
    setInput('');
    setStreaming(true);
    try {
      const products = await api.assistantChat(nextMessages, (token) => {
        setMessages((current) =>
          current.map((message) =>
            message.id === assistantId ? { ...message, content: `${message.content}${token}` } : message
          )
        );
      });
      setMessages((current) =>
        current.map((message) => (message.id === assistantId ? { ...message, products } : message))
      );
    } finally {
      setStreaming(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-tealbrand text-white shadow-panel focus:outline-none focus:ring-2 focus:ring-tealbrand focus:ring-offset-2"
        aria-label="Open ShopMind assistant"
      >
        <Bot className="h-7 w-7" />
      </button>
      {open && (
        <section
          className="fixed bottom-24 right-4 z-50 grid h-[min(680px,calc(100vh-120px))] w-[calc(100vw-2rem)] max-w-md grid-rows-[auto_1fr_auto] rounded-lg border border-slate-200 bg-white shadow-panel"
          role="dialog"
          aria-modal="true"
          aria-label="ShopMind AI assistant"
        >
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded bg-tealbrand text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-bold">ShopMind</h2>
                <p className="text-xs text-slate-500">{streaming ? 'Thinking out loud...' : 'Shopping assistant'}</p>
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-9 w-9 place-items-center rounded border border-slate-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div ref={scrollRef} className="overflow-auto p-4">
            <div className="grid gap-4">
              {messages.map((message) => (
                <div key={message.id} className={`grid gap-2 ${message.role === 'user' ? 'justify-items-end' : ''}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user' ? 'bg-ink text-white' : 'bg-slate-100 text-ink'
                    }`}
                  >
                    {message.content || '...'}
                  </div>
                  {message.products?.length ? (
                    <div className="grid max-w-full grid-cols-1 gap-2">
                      {message.products.slice(0, 2).map((product) => (
                        <ProductCard key={product.id} product={product} compact />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-slate-200 p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  className="shrink-0 rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                >
                  {reply}
                </button>
              ))}
            </div>
            <form onSubmit={onSubmit} className="flex gap-2">
              <label htmlFor="assistant-input" className="sr-only">
                Ask ShopMind
              </label>
              <input
                id="assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Find me something..."
                className="h-11 min-w-0 flex-1 rounded border border-slate-300 px-3"
              />
              <button type="submit" disabled={streaming} aria-label="Send message" className="grid h-11 w-11 place-items-center rounded bg-tealbrand text-white disabled:bg-slate-300">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
