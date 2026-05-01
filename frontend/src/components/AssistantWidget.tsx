import { Bot, Package, Send, ShoppingCart, Sparkles, X } from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useCart } from '../store/cart';
import type { AssistantMessage, OrderSummary, Product } from '../types/shop';

const quickReplies = [
  'Wireless headphones under $150',
  'Gift ideas for mom',
  'Compare running shoes',
  'Track my order',
];

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  paid:      'bg-green-100 text-green-800',
  shipped:   'bg-blue-100 text-blue-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded:  'bg-slate-100 text-slate-600',
};

// ── Sub-components ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ChatProductCard({ product, onAddToCart }: { product: Product; onAddToCart: (p: Product) => void }) {
  return (
    <div className="flex gap-3 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      {product.images?.[0] && (
        <img
          src={product.images[0]}
          alt={product.name}
          className="h-16 w-16 rounded object-cover shrink-0"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-ink">{product.name}</p>
        <p className="text-xs text-slate-500">{product.brand} · ⭐ {product.rating}</p>
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-sm font-bold text-tealbrand">${product.price}</span>
          <button
            type="button"
            onClick={() => onAddToCart(product)}
            className="flex items-center gap-1 rounded bg-tealbrand px-2 py-1 text-[11px] font-semibold text-white hover:bg-teal-700 active:scale-95 transition-transform"
          >
            <ShoppingCart className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderStatusCard({ orders }: { orders: OrderSummary[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <Package className="h-3.5 w-3.5" />
        Your Orders
      </div>
      <div className="grid gap-2">
        {orders.map((order) => (
          <div key={order.id} className="flex items-center justify-between text-xs">
            <span className="font-mono text-slate-500">#{order.id}</span>
            <span className={`rounded-full px-2 py-0.5 font-semibold capitalize ${STATUS_COLORS[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {order.status}
            </span>
            <span className="font-bold text-ink">${order.total}</span>
            <span className="text-slate-400">{order.created_at}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CartToast({ product, onDismiss }: { product: Product; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-white text-xs shadow-lg animate-in slide-in-from-bottom-2">
      <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
      <span><strong>{product.name}</strong> added to cart!</span>
      <button type="button" onClick={onDismiss} className="ml-auto">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [toast, setToast] = useState<Product | null>(null);
  const cart = useCart();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<AssistantMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('shopmind-assistant');
      return saved ? JSON.parse(saved) : initialMessages();
    } catch {
      return initialMessages();
    }
  });

  const scrollRef = useRef<HTMLDivElement | null>(null);

  function initialMessages(): AssistantMessage[] {
    return [{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm ShopMind. Tell me what you're looking for: a budget, a category, a gift idea. I'll find it. You can also ask me to track your orders or add items to your cart.",
    }];
  }

  useEffect(() => {
    sessionStorage.setItem('shopmind-assistant', JSON.stringify(messages));
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function handleAddToCart(product: Product) {
    cart.add(product);
    setToast(product);
  }

  async function sendMessage(text = input) {
    if (!text.trim() || streaming) return;

    const userMsg: AssistantMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const asstId = crypto.randomUUID();
    const asstMsg: AssistantMessage = { id: asstId, role: 'assistant', content: '' };
    const nextMessages = [...messages, userMsg, asstMsg];

    setMessages(nextMessages);
    setInput('');
    setStreaming(true);

    try {
      const products = await api.assistantChat(
        nextMessages,
        // onToken
        (token) => {
          setMessages((cur) =>
            cur.map((m) => (m.id === asstId ? { ...m, content: m.content + token } : m))
          );
        },
        // onAction (add to cart)
        (_action, product) => {
          handleAddToCart(product);
          setMessages((cur) =>
            cur.map((m) => (m.id === asstId ? { ...m, cartAdded: product } : m))
          );
        },
        // onOrderStatus
        (orders) => {
          setMessages((cur) =>
            cur.map((m) => (m.id === asstId ? { ...m, orderStatus: orders } : m))
          );
        },
      );

      setMessages((cur) =>
        cur.map((m) => (m.id === asstId ? { ...m, products } : m))
      );
    } catch (err) {
      setMessages((cur) =>
        cur.map((m) =>
          m.id === asstId ? { ...m, content: "Sorry, something went wrong. Please try again." } : m
        )
      );
    } finally {
      setStreaming(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage();
  }

  function clearChat() {
    setMessages(initialMessages());
    sessionStorage.removeItem('shopmind-assistant');
  }

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-tealbrand text-white shadow-lg hover:scale-105 transition-transform focus:outline-none focus:ring-2 focus:ring-tealbrand focus:ring-offset-2"
        aria-label="Open ShopMind assistant"
      >
        <Bot className="h-7 w-7" />
      </button>

      {open && (
        <section
          className="fixed bottom-24 right-4 z-50 grid h-[min(700px,calc(100vh-120px))] w-[calc(100vw-2rem)] max-w-md grid-rows-[auto_1fr_auto] rounded-xl border border-slate-200 bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
          aria-label="ShopMind AI assistant"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-tealbrand text-white">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-sm font-bold text-ink">ShopMind AI</h2>
                <p className="text-xs text-slate-400">
                  {streaming ? (
                    <span className="flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-tealbrand animate-pulse" />
                      Thinking…
                    </span>
                  ) : 'Ask me anything'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="grid h-8 w-8 place-items-center rounded border border-slate-200 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="overflow-auto px-4 py-3">
            <div className="grid gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`grid gap-2 ${msg.role === 'user' ? 'justify-items-end' : 'justify-items-start'}`}>
                  {/* Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'rounded-br-sm bg-tealbrand text-white'
                        : 'rounded-bl-sm bg-slate-100 text-ink'
                    }`}
                  >
                    {msg.content || (msg.role === 'assistant' && streaming ? <TypingDots /> : '…')}
                  </div>

                  {/* Order status cards */}
                  {msg.orderStatus && msg.orderStatus.length > 0 && (
                    <div className="w-full max-w-[88%]">
                      <OrderStatusCard orders={msg.orderStatus} />
                      <button
                        type="button"
                        onClick={() => { setOpen(false); navigate('/orders'); }}
                        className="mt-1.5 text-xs font-semibold text-tealbrand hover:underline"
                      >
                        View all orders →
                      </button>
                    </div>
                  )}

                  {/* Cart-add confirmation */}
                  {msg.cartAdded && (
                    <div className="flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-3 py-1 text-xs text-green-700 font-medium max-w-[88%]">
                      <ShoppingCart className="h-3 w-3" />
                      {msg.cartAdded.name} added to cart
                    </div>
                  )}

                  {/* Product cards */}
                  {msg.products && msg.products.length > 0 && (
                    <div className="grid w-full max-w-[88%] gap-2">
                      {msg.products.slice(0, 3).map((product) => (
                        <ChatProductCard
                          key={product.id}
                          product={product}
                          onAddToCart={handleAddToCart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator for the latest message while streaming */}
              {streaming && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
                <div className="justify-items-start">
                  <div className="rounded-2xl rounded-bl-sm bg-slate-100">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-3 pt-2 pb-3">
            {/* Toast */}
            {toast && (
              <div className="mb-2">
                <CartToast product={toast} onDismiss={() => setToast(null)} />
              </div>
            )}

            {/* Quick replies */}
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => sendMessage(reply)}
                  disabled={streaming}
                  className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                >
                  {reply}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={onSubmit} className="flex gap-2">
              <label htmlFor="assistant-input" className="sr-only">Ask ShopMind</label>
              <input
                id="assistant-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything…"
                disabled={streaming}
                className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm focus:border-tealbrand focus:outline-none focus:ring-1 focus:ring-tealbrand disabled:bg-slate-50"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Send message"
                className="grid h-10 w-10 place-items-center rounded-lg bg-tealbrand text-white transition-colors hover:bg-teal-700 disabled:bg-slate-200"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </section>
      )}
    </>
  );
}
