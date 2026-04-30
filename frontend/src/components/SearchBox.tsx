import { Mic, Search, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { trackLocalEvent } from '../store/personalizationSlice';

type SpeechRecognitionConstructor = new () => SpeechRecognition;

type SpeechRecognition = EventTarget & {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: { [index: number]: { [index: number]: { transcript: string } } };
};

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const recentSearches = useAppSelector((state) => state.personalization.recentSearches);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const autocomplete = useQuery({
    queryKey: ['autocomplete', query],
    queryFn: () => api.autocomplete(query),
    enabled: query.length > 1
  });

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    return () => window.removeEventListener('pointerdown', onPointer);
  }, []);

  const recognitionCtor = useMemo(() => {
    return (
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition
    );
  }, []);

  function submit(nextQuery = query) {
    if (!nextQuery.trim()) return;
    dispatch(trackLocalEvent({ event_type: 'search', metadata: { query: nextQuery } }));
    api.track({ event_type: 'search', metadata: { query: nextQuery } }).catch(() => undefined);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(nextQuery)}`);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    submit();
  }

  function startVoiceSearch() {
    if (!recognitionCtor) return;
    const recognition = new recognitionCtor();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      submit(transcript);
    };
    recognition.onend = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return (
    <div ref={wrapperRef} className="relative w-full max-w-2xl">
      <form onSubmit={onSubmit} role="search" className="flex h-12 overflow-hidden rounded-lg border border-slate-300 bg-white">
        <label htmlFor="site-search" className="sr-only">
          Search products
        </label>
        <Search className="ml-3 mt-3 h-5 w-5 text-slate-500" aria-hidden="true" />
        <input
          id="site-search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder='Try "red shoes under $50"'
          className="min-w-0 flex-1 px-3 outline-none"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {query && (
          <button type="button" aria-label="Clear search" onClick={() => setQuery('')} className="grid w-10 place-items-center">
            <X className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Start voice search"
          onClick={startVoiceSearch}
          className={`grid w-11 place-items-center ${listening ? 'text-coral' : 'text-slate-700'}`}
        >
          <Mic className="h-5 w-5" />
        </button>
      </form>
      {open && (
        <div className="absolute left-0 right-0 top-14 z-40 rounded-lg border border-slate-200 bg-white p-3 shadow-panel" role="listbox">
          {autocomplete.data?.products.length ? (
            <div className="grid gap-1">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Products</p>
              {autocomplete.data.products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  onClick={() => submit(product.name)}
                  className="flex items-center justify-between rounded px-2 py-2 text-left hover:bg-slate-100"
                >
                  <span>{product.name}</span>
                  <span className="text-sm text-slate-500">{product.category}</span>
                </button>
              ))}
            </div>
          ) : null}
          <div className="mt-2 grid gap-1">
            <p className="px-2 text-xs font-bold uppercase tracking-wide text-slate-500">Suggestions</p>
            {[...(autocomplete.data?.categories ?? []), ...recentSearches].slice(0, 6).map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => submit(item)}
                className="rounded px-2 py-2 text-left hover:bg-slate-100"
              >
                {item}
              </button>
            ))}
            {!autocomplete.data?.categories.length && !recentSearches.length && (
              <p className="px-2 py-2 text-sm text-slate-500">Search by product, category, occasion, budget, or need.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
