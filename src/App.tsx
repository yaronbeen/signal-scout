import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  ExternalLink,
  Eye,
  Globe2,
  History,
  KeyRound,
  LoaderCircle,
  Mail,
  Pause,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Terminal,
  X as Close,
} from "lucide-react";
import { api } from "./api";
import { compareRelevance, contentSignals, filterCreators, formatCount, matchesTopic, relevanceLabel, safeUrl, toCsv } from "./data";
import {
  isConfig,
  load,
  recentSearches,
  savedCreators,
  savedNotes,
  store,
  storeNote,
} from "./storage";
import { sampleCreators } from "./sample";
import {
  platformNames,
  platforms,
  type Contact,
  type Creator,
  type Platform,
  type SearchConfig,
} from "./types";
import { useSearch } from "./useSearch";
import { localSetupPrompt } from "./setup";
import { searchDepths, searchPagesPerQuery } from "./limits";
import { SampleArt, samplePortrait } from "./SampleArt";

type View = "discover" | "shortlist" | "history";
function ProviderCredit() {
  return <a className="provider-credit" href="https://brightdata.com" target="_blank" rel="noreferrer"><span>Powered by</span><strong className="brand-wordmark">Bright Data</strong><ArrowUpRight size={12} /></a>;
}
function ProviderSetup() {
  return <section className="provider-setup" aria-label="Bright Data setup steps">
    <h3>Your Bright Data checklist</h3>
    <ol>
      <li><strong>Create your account and check credits.</strong> Live searches are billed to your Bright Data account. <a href="https://brightdata.com" target="_blank" rel="noreferrer">Create an account</a> · <a href="https://brightdata.com/pricing" target="_blank" rel="noreferrer">Check pricing</a></li>
      <li><strong>Enable Web Scraper API access for your key.</strong> Required to collect creator profiles on all five platforms and discover YouTube/TikTok content. <a href="https://docs.brightdata.com/products/scrapers/overview" target="_blank" rel="noreferrer">Web Scraper API guide</a></li>
      <li><strong>Set up a SERP API search zone for Instagram, LinkedIn & X.</strong> A zone is a named search service in your Bright Data account. After connecting, choose it in the search form. “Active” does not guarantee it can complete a search. <a href="https://docs.brightdata.com/scraping-automation/serp-api/quickstart" target="_blank" rel="noreferrer">Set up search for Instagram, LinkedIn & X</a></li>
      <li><strong>Optional: enable Web Unlocker.</strong> Only needed for the “Scan website” email check, which is separately billed. Profile email discovery works without it. <a href="https://docs.brightdata.com/scraping-automation/web-unlocker/quickstart" target="_blank" rel="noreferrer">Website scan setup</a></li>
      <li><strong>Copy your API key and enter it here.</strong> Use your own key, only in the app’s key field. <a href="https://brightdata.com/cp/setting/users" target="_blank" rel="noreferrer">Find your API key</a></li>
    </ol>
  </section>;
}
function PlatformMark({ platform }: { platform: Platform }) {
  return (
    <span className={`platform-mark ${platform}`} aria-hidden="true">
      {platform === "youtube" ? (
        <svg viewBox="0 0 24 24">
          <rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor" />
          <path d="m10 9 6 3-6 3Z" fill="white" />
        </svg>
      ) : platform === "instagram" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.5" cy="6.5" r=".8" fill="currentColor" />
        </svg>
      ) : platform === "linkedin" ? (
        "in"
      ) : platform === "tiktok" ? (
        "♪"
      ) : (
        "𝕏"
      )}
    </span>
  );
}
function Avatar({
  creator,
  large = false,
}: {
  creator: Creator;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const color = [...creator.name].reduce((n, c) => n + c.charCodeAt(0), 0) % 6;
  return (
    <div className={`avatar avatar-${color} ${large ? "large" : ""}`}>
      {creator.sample && samplePortrait(creator.handle) ? <img src={samplePortrait(creator.handle)} alt="" /> : creator.avatar && !failed ? (
        <img
          src={safeUrl(creator.avatar)}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="avatar-shape" />
          <span>
            {creator.name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")}
          </span>
        </>
      )}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
  feedback = "",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
  feedback?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.showModal();
    return () => {
      ref.current?.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Close size={20} />
        </button>
      </div>
      {children}
      {feedback && <div className="dialog-feedback" role="status"><CheckCircle2 size={17} />{feedback}</div>}
    </dialog>
  );
}
function ShortlistNote({ value, onSave }: { value: string; onSave: (note: string) => boolean }) {
  const [draft, setDraft] = useState(value);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  return <form className="shortlist-note" onSubmit={e => {
    e.preventDefault();
    const saved = onSave(draft);
    setFailed(!saved);
    setMessage(saved ? 'Note saved in this browser.' : 'Could not save to this browser. Your note is kept for this session; export CSV before closing.');
  }}>
    <label className="field-label" htmlFor="shortlist-note">Your shortlist note</label>
    <textarea id="shortlist-note" value={draft} maxLength={2000} rows={3} aria-describedby="note-help" onChange={e => { setDraft(e.target.value); setMessage(''); }} placeholder="Why are they a good fit? What should you ask them?" />
    <small id="note-help">Saved only in this browser and included in CSV exports. Save changes before closing.</small>
    <button className="secondary-button" type="submit">Save note</button>
    {message && <p className={failed ? 'form-error' : 'note-feedback'} role="status">{message}</p>}
  </form>;
}
export default function App() {
  const search = useSearch();
  const [view, setView] = useState<View>("discover");
  const [editing, setEditing] = useState(false);
  const beforeNewDraft = useRef<{brief: string; selected: Platform[]; depth: number} | null>(null);
  const [initialConfig] = useState(() => {
    const c = load<unknown>("config", null, true);
    return isConfig(c) ? c : search.creators.some(c => c.sample) ? { brief: "AI tools & automation", keywords: ["AI tools", "automation"], platforms: [...platforms], depth: 5 } : null;
  });
  const [activeConfig, setActiveConfig] = useState<SearchConfig | null>(initialConfig);
  const [key, setKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [unlockerZone, setUnlockerZone] = useState("");
  const [searchAvailable, setSearchAvailable] = useState(true);
  const [metadataAvailable, setMetadataAvailable] = useState(true);
  const [searchZones, setSearchZones] = useState<string[]>([]);
  const [searchZone, setSearchZone] = useState("");
  const [keyModal, setKeyModal] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [help, setHelp] = useState(false);
  const [brief, setBrief] = useState(initialConfig?.keywords.join(", ") || "");
  const [selected, setSelected] = useState<Platform[]>(initialConfig?.platforms || [...platforms]);
  const [depth, setDepth] = useState(initialConfig?.depth || 5);
  const [formError, setFormError] = useState("");
  const [shortlist, setShortlist] = useState<Creator[]>(savedCreators);
  const [notes, setNotes] = useState(savedNotes);
  const [history, setHistory] = useState<SearchConfig[]>(recentSearches);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [emailOnly, setEmailOnly] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("relevance");
  const [minimum, setMinimum] = useState('');
  const [maximum, setMaximum] = useState('');
  const [topic, setTopic] = useState('');
  const [matchingPostOnly, setMatchingPostOnly] = useState(false);
  const [details, setDetails] = useState<Creator | null>(null);
  const [toast, setToast] = useState("");
  const [shortlistStorageWarning, setShortlistStorageWarning] = useState('');
  const shortlistWarningRef = useRef<HTMLParagraphElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [sample, setSample] = useState(() =>
    search.creators.some((c) => c.sample),
  );
  const [lastBrief, setLastBrief] = useState(() => {
    const c = load<unknown>("config", null, true);
    return isConfig(c)
      ? c.brief
      : search.creators.some((c) => c.sample)
        ? "AI tools & automation"
        : "Your recent search";
  });
  const [reconcile, setReconcile] = useState<Platform | null>(null);
  const [snapshotDraft, setSnapshotDraft] = useState("");
  const currentCreatorsRef = useRef(search.creators);
  useEffect(() => {
    currentCreatorsRef.current = search.creators;
    const updates = new Map(search.creators.map((c) => [c.id, c]));
    setShortlist((current) => {
      let changed = false;
      const next = current.map((old) => {
        const fresh = updates.get(old.id);
        if (!fresh || fresh === old) return old;
        const merged = {
          ...fresh,
          contacts: [
            ...fresh.contacts,
            ...old.contacts.filter(
              (c) => !fresh.contacts.some((n) => n.email === c.email),
            ),
          ],
        };
        if (JSON.stringify(merged) === JSON.stringify(old)) return old;
        changed = true;
        return merged;
      });
      if (!changed) return current;
      if (!store("shortlist", next)) setShortlistStorageWarning('Could not save shortlist updates to this browser. Changes are kept for this session; export CSV before closing.');
      return next;
    });
    setDetails(current => {
      const fresh = current && updates.get(current.id);
      return current && fresh ? { ...fresh, contacts: [...fresh.contacts, ...current.contacts.filter(c => !fresh.contacts.some(n => n.email === c.email))] } : current;
    });
  }, [search.creators]);
  const resultsRef = useRef<HTMLElement>(null);
  const recoveryRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (keyModal || help || details?.id) setToast("");
  }, [keyModal, help, details?.id]);
  useEffect(() => {
    if (shortlistStorageWarning && details) shortlistWarningRef.current?.scrollIntoView({ block: 'nearest' });
  }, [shortlistStorageWarning, details?.id]);
  useEffect(() => {
    if (!search.running) return;
    const start = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [search.running]);
  function clearFilters() {
    setFilter("");
    setFilterPlatform("all");
    setEmailOnly(false);
    setMinimum('');
    setMaximum('');
    setTopic('');
    setMatchingPostOnly(false);
  }
  function go(next: View) {
    setView(next);
    clearFilters();
  }
  function toggleSaved(c: Creator) {
    if (!shortlist.some(s => s.id === c.id) && shortlist.some(s => Boolean(s.sample) !== Boolean(c.sample))) {
      setToast('Keep sample and live creators separate. Remove saved sample creators before saving live results, or export live results directly.'); return;
    }
    const next = shortlist.some((s) => s.id === c.id)
      ? shortlist.filter((s) => s.id !== c.id)
      : [...shortlist, c];
    setShortlist(next);
    if (!store("shortlist", next))
      setToast(
        "Could not save to this browser. Export your shortlist before closing.",
      );
    else
      setToast(
        next.some((s) => s.id === c.id)
          ? `${c.name} added to your shortlist`
          : `${c.name} removed from your shortlist`,
      );
  }
  function saveFiltered() {
    const additions = visible.filter(c => !shortlist.some(s => s.id === c.id));
    if (!additions.length) return;
    const next = [...shortlist, ...additions];
    if (next.some(c => Boolean(c.sample) !== Boolean(next[0].sample))) {
      setToast('Keep sample and live creators separate. Remove saved sample creators before saving live results, or export live results directly.');
      return;
    }
    setShortlist(next);
    setToast(store('shortlist', next)
      ? `${additions.length} creator${additions.length === 1 ? '' : 's'} added to your shortlist`
      : 'Could not save to this browser. Export your shortlist before closing.');
  }
  function saveNote(id: string, note: string): boolean {
    const next = { ...notes, [id]: note };
    setNotes(next);
    return storeNote(id, note);
  }
  async function connect(e: FormEvent) {
    e.preventDefault();
    setConnecting(true);
    setKeyError("");
    try {
      const response = await api<{
        connected: boolean;
        unlockerZone: string;
        searchAvailable: boolean;
        searchZones?: string[];
        metadataAvailable?: boolean;
      }>("connect", keyDraft.trim(), {});
      setKey(keyDraft.trim());
      setConnected(true);
      setUnlockerZone(response.unlockerZone);
      setSearchAvailable(response.searchAvailable);
      setMetadataAvailable(response.metadataAvailable !== false);
      const zones = response.searchZones || [];
      setSearchZones(zones);
      setSearchZone(current => zones.includes(current) ? current : zones.length === 1 ? zones[0] : "");
      setKeyDraft("");
      setKeyModal(false);
      setToast(response.metadataAvailable === false ? "Key connected, but account metadata is unavailable. Check key permissions and reconnect to load your zones. YouTube/TikTok require Web Scraper API access and credits." : response.searchAvailable ? "Key connected. Choose your search zone before searching. Service access and credits are checked when collection runs." : "Key connected. Set up a search zone for Instagram, LinkedIn & X. YouTube/TikTok require Web Scraper API access and credits.");
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }
  function config(): SearchConfig | null {
    const keywords = brief
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!brief.trim()) {
      setFormError("Add a topic or keyword to start your search.");
      return null;
    }
    if (
      !keywords.length ||
      keywords.length > 3 ||
      keywords.some((k) => k.length > 100)
    ) {
      setFormError(
        "Add one to three focused search terms, each under 100 characters.",
      );
      return null;
    }
    if (!selected.length) {
      setFormError("Choose at least one platform.");
      return null;
    }
    if (connected && searchZones.length > 1 && !searchZone && selected.some(p => ['instagram', 'linkedin', 'x'].includes(p))) {
      setFormError('Choose your Bright Data search zone for Instagram, LinkedIn & X before searching.');
      return null;
    }
    if (search.jobs.length) {
      setFormError(
        "Resume or discard your previous jobs before starting a new search.",
      );
      return null;
    }
    setFormError("");
    return { brief: brief.trim(), keywords, platforms: selected, depth };
  }
  async function begin(e: FormEvent) {
    e.preventDefault();
    const c = config();
    if (!c) return;
    if (!connected || !key) {
      setKeyModal(true);
      return;
    }
    setSample(false);
    setEditing(false);
    beforeNewDraft.current = null;
    setActiveConfig(c);
    setLastBrief(c.brief);
    setElapsed(0);
    clearFilters();
    const next = [c, ...history.filter((h) => h.brief !== c.brief)].slice(
      0,
      15,
    );
    setHistory(next);
    store("history", next);
    await search.start(c, key, false, searchZone);
  }
  function demo() {
    if (search.running || search.jobs.length) return;
    setSample(true);
    setLastBrief("AI tools & automation");
    setBrief("AI tools, automation");
    setSelected([...platforms]);
    setDepth(5);
    setFormError("");
    setEditing(false);
    beforeNewDraft.current = null;
    setActiveConfig({ brief: "AI tools & automation", keywords: ["AI tools", "automation"], platforms: [...platforms], depth: 5 });
    search.showSample(sampleCreators);
    go("discover");
  }
  function focusResults() {
    if (search.jobs.length && !search.running && recoveryRef.current) {
      recoveryRef.current.focus({ preventScroll: true });
      window.scrollTo({ top: Math.floor(recoveryRef.current.getBoundingClientRect().top + window.scrollY) });
      return;
    }
    if (search.running && progressRef.current) {
      progressRef.current.focus({ preventScroll: true });
      window.scrollTo({ top: Math.floor(progressRef.current.getBoundingClientRect().top + window.scrollY) });
      return;
    }
    const heading = resultsRef.current?.querySelector<HTMLElement>("h2");
    heading?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function editSearch(fresh = false) {
    if (search.running) return;
    if (fresh && search.jobs.length) {
      setToast("Resume or discard your existing job references before starting a new search.");
      return;
    }
    if (fresh) {
      if (!beforeNewDraft.current) beforeNewDraft.current = {
        brief: collectedConfig?.keywords.join(", ") || brief,
        selected: collectedConfig?.platforms || selected,
        depth: collectedConfig?.depth || depth,
      };
      setBrief("");
      setSelected([...platforms]);
      setDepth(5);
    } else if (collectedConfig) {
      beforeNewDraft.current = null;
      setBrief(collectedConfig.keywords.join(", "));
      setSelected([...collectedConfig.platforms]);
      setDepth(collectedConfig.depth);
    }
    setFormError("");
    setEditing(true);
    window.setTimeout(() => document.getElementById("topic")?.focus(), 0);
  }
  function download(data: Creator[]) {
    const url = URL.createObjectURL(
      new Blob([toCsv(data, notes)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-scout-${view === "shortlist" ? "shortlist" : "creators"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${data.length} creator${data.length === 1 ? "" : "s"}`);
  }
  function backToResults() {
    if (beforeNewDraft.current) {
      setBrief(beforeNewDraft.current.brief);
      setSelected(beforeNewDraft.current.selected);
      setDepth(beforeNewDraft.current.depth);
      beforeNewDraft.current = null;
    }
    setEditing(false);
  }
  function profilePending(c: Creator) {
    if (c.sample || c.enrichmentError) return false;
    return c.profileStatus === "pending";
  }
  function profilePartial(c: Creator) {
    return !c.sample && (Boolean(c.enrichmentError) || c.profileStatus === "partial");
  }
  function profileUnknown(c: Creator) {
    return !c.sample && !c.profileStatus && !c.enrichmentError && !profilePending(c);
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setToast("Copied to clipboard");
    } catch {
      setToast("Clipboard unavailable. Select and copy the text instead.");
    }
  }
  async function scan(c: Creator) {
    if (!connected) {
      setKeyModal(true);
      return;
    }
    setScanning(true);
    setScanError("");
    try {
      const response = await api<{ contacts: Contact[] }>("contact", key, {
        url: c.websites[0],
        zone: unlockerZone,
      });
      const latest =
        currentCreatorsRef.current.find((creator) => creator.id === c.id) || c;
      const updated = {
        ...latest,
        contacts: [
          ...latest.contacts,
          ...response.contacts.filter(
            (e) => !latest.contacts.some((old) => old.email === e.email),
          ),
        ],
      };
      search.updateCreator(updated);
      setDetails(updated);
      setShortlist(current => {
        if (!current.some(s => s.id === c.id)) return current;
        const next = current.map(s => s.id === c.id ? { ...updated, contacts: [...updated.contacts, ...s.contacts.filter(contact => !updated.contacts.some(n => n.email === contact.email))] } : s);
        if (!store("shortlist", next)) setShortlistStorageWarning('Could not save shortlist updates to this browser. Changes are kept for this session; export CSV before closing.');
        return next;
      });
      setToast(
        response.contacts.length
          ? `Found ${response.contacts.length} public website email(s)`
          : "No public email found on this page.",
      );
    } catch (e) {
      setScanError(e instanceof Error ? e.message : "Website scan failed.");
    } finally {
      setScanning(false);
    }
  }
  const source = view === "shortlist" ? shortlist : search.creators;
  useEffect(() => {
    if (topic && !source.some(c => c.matchedTerms.some(term => term.toLowerCase() === topic))) setTopic('');
  }, [source, topic]);
  const audienceUnit = filterPlatform === 'youtube' ? 'subscribers' : filterPlatform === 'all' ? 'followers / subscribers' : 'followers';
  const min = minimum === '' ? null : Number(minimum);
  const max = maximum === '' ? null : Number(maximum);
  const rangeError = [min, max].some(n => n !== null && (!Number.isSafeInteger(n) || n < 0))
    ? 'Use whole audience counts of zero or more.'
    : min !== null && max !== null && min > max ? 'Minimum audience must not exceed maximum audience.' : '';
  const topics = [...new Set(source.flatMap(c => c.matchedTerms.map(term => term.toLowerCase())))].sort();
  const visible = filterCreators(source, { platform: filterPlatform, query: filter, emailOnly, minimum: min, maximum: max, topic, matchingPostOnly })
    .sort((a, b) =>
      sort === "audience"
        ? (b.followers ?? -1) - (a.followers ?? -1)
        : sort === "email"
          ? Number(b.contacts.length > 0) - Number(a.contacts.length > 0)
           : compareRelevance(a,b),
    );
  const unsavedCount = visible.filter(c => !shortlist.some(s => s.id === c.id)).length;
  const emailCount = source.filter((c) => c.contacts.length).length;
  const usedPlatforms = new Set(source.map((c) => c.platform)).size;
  const done = platforms.filter(
    (p) => search.progress[p].phase === "done",
  ).length;
  const hasProgress = platforms.some(
    (p) => search.progress[p].phase !== "idle",
  );
  const hasWork = search.creators.length > 0 || search.jobs.length > 0 || hasProgress || search.running;
  const showComposer = !hasWork || editing;
  const collectedConfig = search.jobs[0]?.config || activeConfig;
  const filteredJobs = view === 'discover' ? search.jobs.filter(j => filterPlatform === 'all' || j.platform === filterPlatform) : [];
  const collectingJobs = search.running ? filteredJobs.filter(j => ['discovering', 'enriching'].includes(search.progress[j.platform].phase)) : [];
  const collectingLabel = filterPlatform === 'all' ? 'Creator' : platformNames[filterPlatform as Platform];
  const collectionStatus = collectingJobs.map(j => `${platformNames[j.platform]}: ${search.progress[j.platform].message}`).join(' · ');
  const filteredFailure = view === 'discover' && platforms.some(p => (filterPlatform === 'all' || p === filterPlatform) && search.progress[p].phase === 'error');
  useEffect(() => {
    if (hasWork && view === "discover" && !editing) focusResults();
  }, [hasWork, view, editing, search.running]);
  return (
    <div className="app-shell">
      <header className="masthead">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go("discover");
          }}
        >
          <span className="brand-icon">
            <Radio size={23} />
          </span>
          <span>
            signal<span className="brand-light">scout</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={view === "discover" ? "active" : ""}
            aria-current={view === "discover" ? "page" : undefined}
            onClick={() => go("discover")}
          >
            Discover
          </button>
          <button
            className={view === "shortlist" ? "active" : ""}
            aria-current={view === "shortlist" ? "page" : undefined}
            onClick={() => go("shortlist")}
          >
            Your shortlist
            <span className="nav-count">{shortlist.length}</span>
          </button>
          <button
            className={view === "history" ? "active" : ""}
            aria-current={view === "history" ? "page" : undefined}
            onClick={() => go("history")}
          >
            Recent searches
          </button>
        </nav>
            <button
              className={`connect-button ${connected ? "connected" : ""}`}
              onClick={() => {
                setKeyError("");
                setKeyModal(true);
              }}
            >
              {connected ? <CheckCircle2 size={15} /> : <KeyRound size={15} />}
              {connected ? "Bright Data connected" : "Connect Bright Data"}
            </button>
      </header>
      <div className="main-shell">
        <main>
          {view === "discover" && (
            <>
              {hasWork && <div className="brief-ribbon">
                <div className="brief-topic"><Search size={20} /><div><strong>{lastBrief}</strong><small>{(collectedConfig?.platforms || platforms).map(p => platformNames[p]).join(" · ")} · Up to {collectedConfig?.depth || 5} profiles / platform</small></div></div>
                <div className="ribbon-actions">
                  <button className="secondary-button" disabled={search.running} onClick={() => editing ? backToResults() : editSearch()}>{editing ? "Back to results" : "Edit search"}</button>
                  <button className="secondary-button" disabled={search.running} onClick={() => editSearch(true)}>New search</button>
                </div>
              </div>}
              {showComposer && <div className="arrival">
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                      Creator discovery, with context
                  </div>
                  <h1>
                    Find your people.
                    <br />
                    <span>Follow the signal.</span>
                  </h1>
                  <p>
                    Discover creators across five platforms. See the evidence behind each match, find public contacts, and build your shortlist.
                  </p>
                  <div className="provider-strip"><ProviderCredit /></div>
                  <SampleArt />
                </div>
              </section>
              <form className="search-panel" onSubmit={begin}>
                <div className="search-panel-heading">
                  <div>
                    <h2>Who are you looking for?</h2>
                  </div>
                  <button
                    type="button"
                    className="text-button sample-trigger"
                disabled={search.running || search.jobs.length > 0}
                onClick={demo}
                  >
                    <Eye size={15} /> Explore a sample{" "}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <label className="topic-field-label" htmlFor="topic">Topics or keywords</label>
                <label className="search-input-wrap">
                  <Search size={21} />
                  <input
                    id="topic"
                    aria-label="Topic or keyword"
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    maxLength={240}
                    placeholder="AI tools, automation"
                    disabled={search.running}
                  />
                </label>
                <p className="helper">Up to 3 focused topics, separated by commas.</p>
                  <div className="suggestions">
                    {[
                      "AI & automation",
                      "Skincare",
                      "SaaS & startups",
                    ].map((s, i) => (
                      <button
                        type="button"
                        key={s}
                        disabled={search.running}
                        onClick={() => {
                          setBrief(
                            [
                              "AI tools, automation",
                              "skincare, beauty reviews",
                              "SaaS founders, startup tools",
                            ][i],
                          );
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                <div className="search-options">
                  <fieldset className="platform-options">
                    <legend>Search across</legend>
                    <div>
                      {platforms.map((p) => (
                        <button
                          type="button"
                          key={p}
                          aria-pressed={selected.includes(p)}
                          disabled={search.running}
                          className={`platform-choice ${selected.includes(p) ? "selected" : ""}`}
                          onClick={() =>
                            setSelected((prev) =>
                              prev.includes(p)
                                ? prev.filter((s) => s !== p)
                                : [...prev, p],
                            )
                          }
                        >
                          <PlatformMark platform={p} />
                          {platformNames[p]}
                          {selected.includes(p) && <Check size={12} />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="depth-option">
                    <label htmlFor="depth">Search depth</label>
                    <div className="select-wrap">
                      <select
                        id="depth"
                        value={depth}
                        disabled={search.running}
                        onChange={(e) => setDepth(Number(e.target.value))}
                      >
                        {searchDepths.map(value => (
                          <option key={value} value={value}>
                            {value === 5 ? 'Focused' : value === 10 ? 'Balanced' : value === 20 ? 'Broader' : value === 50 ? 'Deep' : value === 100 ? 'Extended' : 'Maximum'} · up to {value} / platform
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
                {connected && searchZones.length > 0 && (
                  <div className="search-zone-option">
                    <label htmlFor="search-zone">Bright Data search zone · Instagram, LinkedIn & X</label>
                    <select id="search-zone" value={searchZone} disabled={search.running} onChange={e => setSearchZone(e.target.value)}>
                      <option value="" disabled>Choose your search zone</option>
                      {searchZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                    <small>{searchZones.length > 1 ? 'You have multiple zones. Choose the one configured for working Google searches; the app does not test them with paid requests. ' : ''}If search fails, check this zone’s settings. Selecting another zone does not repeat any paid request.</small>
                  </div>
                )}
                <p className="spend-note"><strong>Your account pays for live collection.</strong><br />Public data only. Search, post collection and profile collection are separate paid stages. Depth limits records, not a currency budget.</p>
                <div className="search-footer">
                  <button
                    className="primary-button"
                    type="submit"
                    disabled={search.running}
                  >
                    {search.running ? (
                      <>
                        <LoaderCircle size={17} className="spin" /> Finding your
                        people…
                      </>
                    ) : (
                      <>
                        <Search size={17} /> Discover creators{" "}
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                </div>
                <details className="usage-disclosure"><summary>Collection limits & pricing</summary><p className="usage-summary">
                  Up to {depth} profiles per platform. YouTube/TikTok: up to {depth} posts per topic. Instagram/LinkedIn/X: up to {2 * searchPagesPerQuery(depth, Math.min(3, Math.max(1, new Set(brief.split(/[,\n]/).map(term => term.trim()).filter(Boolean)).size)))} search pages per topic (profiles + content), then up to {depth} discovered posts per platform to identify authors. Actual results may be fewer. Search, post collection and profile collection are separate paid stages. <a href="https://brightdata.com/pricing" target="_blank" rel="noreferrer">View pricing <ArrowUpRight size={11} /></a>
                </p></details>
                <p className="form-bottom">Your own key required. Sample mode needs no key.</p>
                {connected && !searchAvailable && (
                  <p className="form-error">
                    {metadataAvailable ? <>No active search zone found. For Instagram, LinkedIn, and X, <a href="https://docs.brightdata.com/scraping-automation/serp-api/quickstart" target="_blank" rel="noreferrer">set up Bright Data’s search API</a>, then reconnect.</> : <>Account metadata is unavailable. Check your key’s account-metadata permissions and reconnect to load search zones.</>} YouTube and TikTok can run separately with Web Scraper API access and credits.
                  </p>
                )}
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
              </form>
              </div>}
              {hasWork && !showComposer && <button className="text-button recovery-sample" disabled={search.running || search.jobs.length > 0} onClick={demo}><Eye size={16} /> Explore a sample</button>}
              {search.jobs.length > 0 && !search.running && (
                <div className="resume-banner" ref={recoveryRef} tabIndex={-1} aria-label="Resume saved collection">
                  <History size={20} />
                  <div>
                    <strong>
                      You have {search.jobs.length} unfinished platform
                      collection(s).
                    </strong>
                    <span>
                      Continue saved work. Resume can start separately billed post or profile collection; existing snapshot jobs are checked without resubmitting them. Pausing or discarding references does not cancel Bright Data jobs; submitted jobs may still be billed.
                    </span>
                    <span>Refresh clears your key; reconnect to resume. Results and job references are stored in this tab only and may be lost when you close the tab. Export results and retain snapshot IDs first.</span>
                    <ul className="saved-job-list" aria-label="Saved collection references">
                      {search.jobs.filter(j => j.stage !== "uncertain").map(j => <li key={j.platform}>
                        <strong>{platformNames[j.platform]}</strong>
                        <span>{j.stage === "queued" ? "Discovery queued" : j.stage === "ready" ? "Ready for separately paid profile collection" : j.stage === "posts-ready" ? "Ready for separately paid post collection" : j.stage === "posts" ? "Post collection" : j.stage === "enrich" ? "Profile collection" : "Content discovery"}</span>
                        {j.snapshot && <div className="job-reference"><code>{j.snapshot}</code><button className="icon-button" aria-label={`Copy ${platformNames[j.platform]} snapshot ID`} onClick={() => copy(j.snapshot)}><Copy size={17} /></button></div>}
                      </li>)}
                    </ul>
                    {connected && searchZones.length > 0 && !showComposer && <div className="search-zone-option">
                      <label htmlFor="resume-search-zone">Bright Data search zone · Instagram, LinkedIn & X</label>
                      <select id="resume-search-zone" value={searchZone} onChange={e => { setSearchZone(e.target.value); setFormError(""); }}>
                        <option value="" disabled>Choose your search zone</option>
                        {searchZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                      </select>
                      <small>Select the zone configured for working Google searches. Selecting a zone does not run a paid test or repeat a request.</small>
                    </div>}
                    {search.jobs
                      .filter((j) => j.stage === "uncertain")
                      .map((j) => (
                        <div className="uncertain-job" key={j.platform}>
                            <strong>
                              {platformNames[j.platform]}: submission needs
                              checking.
                            </strong>
                            {j.uncertainStage !== 'search' && <span>Stage: {j.uncertainStage === 'posts' ? 'post collection' : j.uncertainStage === 'enrich' ? 'profile enrichment' : 'content discovery'} · Submitted {new Date(j.createdAt).toLocaleString()}</span>}
                          <span>
                            {j.uncertainStage === 'search' ? 'The search may already have used credits. Review account usage before choosing to repeat it.' : 'Find the submitted job in your Bright Data dashboard, then add its snapshot ID. An uncertain submission is never repeated automatically.'}
                          </span>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              if (j.uncertainStage === 'search') { if (window.confirm('Repeat this paid search? The earlier request may already have used Bright Data credits.')) { search.retrySearch(j.platform); setToast("New paid search authorized and queued. Select your search zone if needed, then use Resume search to submit it."); } }
                              else { setReconcile(j.platform); setSnapshotDraft(""); }
                            }}
                          >
                            {j.uncertainStage === 'search' ? 'Allow a new paid search' : 'Add existing job reference'}
                          </button>
                        </div>
                      ))}
                  </div>
                  <button
                    className="secondary-button"
                    disabled={search.jobs.every((j) => j.stage === "uncertain") || (connected && searchZones.length > 1 && !searchZone && search.jobs.some(j => j.stage === "queued" && ["instagram", "linkedin", "x"].includes(j.platform)))}
                    onClick={() => {
                      if (!connected) setKeyModal(true);
                      else {
                        if (!searchZone && searchZones.length > 1 && search.jobs.some(j => j.stage === 'queued' && ['instagram', 'linkedin', 'x'].includes(j.platform))) {
                          setFormError('Choose your Bright Data search zone before resuming discovery.');
                          return;
                        }
                        setSample(false);
                        search.start(search.jobs[0].config, key, true, searchZone);
                      }
                    }}
                  >
                    Resume search
                  </button>
                  <button
                    className="text-button"
                    onClick={() => {
                      if (!window.confirm('Discard saved job references? Submitted Bright Data jobs keep running and may be billed. You will lose the app’s resume links.')) return;
                      search.discardJobs();
                      setFormError("");
                    }}
                  >
                    Discard references
                  </button>
                </div>
              )}
              {formError && !showComposer && <p className="form-error" role="alert">{formError}</p>}
              {(hasProgress || search.running) && (
                <section
                  className="progress-panel"
                  aria-label="Collection progress"
                  ref={progressRef}
                  tabIndex={-1}
                >
                  <div className="progress-heading">
                    <div>
                      <span
                        className={`pulse-dot ${search.running ? "" : "static"}`}
                      />
                      <strong>
                        {search.running
                          ? "Following the signals"
                          : "Collection overview"}
                      </strong>
                      <span>
                        {search.running
                          ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s · ${done}/${collectedConfig?.platforms.length || selected.length} platforms complete`
                          : "Each platform is collected independently"}
                      </span>
                    </div>
                    {search.running && (
                      <button className="text-button" onClick={search.pause}>
                        <Pause size={14} /> Pause search
                      </button>
                    )}
                  </div>
                  {search.running && <p className="pause-note">Pausing stops this app from advancing collection. Submitted Bright Data jobs may keep running and be billed.</p>}
                  <div className="progress-platforms">
                    {platforms
                      .filter(
                        (p) =>
                          search.progress[p].phase !== "idle" ||
                          (collectedConfig?.platforms || selected).includes(p),
                      )
                      .map((p) => (
                        <div
                          className={`progress-item ${search.progress[p].phase}`}
                          key={p}
                        >
                          <div>
                            <PlatformMark platform={p} />
                            <strong>{platformNames[p]}</strong>
                            {search.progress[p].phase === "done" ? (
                              <CheckCircle2 size={15} />
                            ) : ["discovering", "enriching"].includes(
                                search.progress[p].phase,
                              ) ? (
                              <LoaderCircle size={15} className="spin" />
                            ) : null}
                          </div>
                          <p>{search.progress[p].message}</p>
                          {search.progress[p].snapshot && (
                            <small>Job {search.progress[p].snapshot}</small>
                          )}
                        </div>
                      ))}
                  </div>
                </section>
              )}
            </>
          )}
          {view === "history" ? (
            <section className="standalone-view">
              <div className="eyebrow">YOUR RESEARCH TRAIL</div>
              <h1>Pick up a signal.</h1>
              <p>
                Recent search briefs saved in this browser. Running one again
                uses new Bright Data credits.
              </p>
              {history.length ? (
                <div className="history-list">
                  {history.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setBrief(h.keywords.join(", "));
                        setSelected(h.platforms);
                        setDepth(h.depth);
                        beforeNewDraft.current = null;
                        setEditing(true);
                        go("discover");
                      }}
                    >
                      <span className="history-icon">
                        <Search size={20} />
                      </span>
                      <div>
                        <strong>{h.brief}</strong>
                        <p>
                          {h.keywords.join(" · ")}{" "}
                          <span>• {h.platforms.length} platforms</span>
                        </p>
                      </div>
                       <ArrowRight size={20} />
                      <span className="history-action">Edit brief</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <History size={30} />
                  <h3>Your research starts here.</h3>
                  <p>
                    Your recent searches will appear after your first live
                    discovery.
                  </p>
                  <button
                    className="primary-button"
                    onClick={() => go("discover")}
                  >
                    Discover creators <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              <section
                hidden={view === "discover" && !hasWork}
                className={`results-section ${view === "shortlist" ? "standalone-view" : ""}`}
                ref={resultsRef}
              >
                <div className="results-heading">
                  <div>
                    {view === "shortlist" && (
                      <div className="eyebrow">GOOD FITS, ALL IN ONE PLACE</div>
                    )}
                    <h2 tabIndex={-1}>
                      {view === "shortlist"
                        ? "Your next partnerships."
                        : source.length || search.running
                          ? "Meet your next collaborators."
                          : hasProgress ? "No creator profiles to show yet." : "A better way to find your fit."}
                    </h2>
                    <p>
                      {view === "shortlist" ? (
                        <>Your saved creators. Kept in this browser.{source.length > 0 && <> <strong>{source.length} creators</strong> · {emailCount} with public email · {usedPlatforms} platforms</>}</>
                      ) : source.length ? (
                        <>
                          <strong>{source.length} {sample ? "sample creators" : "creators discovered"}</strong> · {emailCount} with public email · {usedPlatforms} platforms
                        </>
                      ) : (
                         search.running ? "Collection is in progress. Profiles appear here as each platform returns results." : hasProgress ? "Check the platform outcomes above. Broaden topics for no matches, or resolve the collection error and resume saved work." : "From a topic to a shortlist. All the context you need, none of the busywork."
                      )}
                    </p>
                  </div>
                  {source.length > 0 && (
                    <button
                      className="secondary-button"
                      onClick={() => download(visible)}
                      disabled={!visible.length}
                    >
                      <ArrowDownToLine size={16} /> Export CSV{" "}
                      <span>{visible.length}</span>
                    </button>
                  )}
                </div>
                {view === 'discover' && search.running && !source.length && <div className="collection-wait" role="status">
                  <div className="scout-radar" aria-hidden="true"><span /><i /><b /></div>
                  <h3>Finding your next collaborators.</h3>
                  <p>{collectionStatus || 'Waiting for the collection to return profiles…'}</p>
                  <small>Results appear as they arrive. No need to refresh.</small>
                </div>}
                {source.length > 0 && (
                  <>
                    {source.some((c) => c.sample) && (
                      <div className="sample-notice">
                        <Sparkles size={16} />
                        <strong>Sample workspace</strong>
                        <span>
                          Fictional creators and illustrative metrics. Contacts are illustrative. No live data or paid calls.
                        </span>
                      </div>
                    )}
                    <p className="results-explanation">Topic matches are evidence signals, not audience-fit or campaign-performance scores.</p>
                    <div className="results-toolbar">
                      <div
                        className="platform-tabs"
                        role="group"
                        aria-label="Filter by platform"
                      >
                        <button
                          className={filterPlatform === "all" ? "active" : ""}
                          aria-pressed={filterPlatform === 'all'}
                          onClick={() => setFilterPlatform("all")}
                        >
                          All creators <span>{source.length}</span>
                        </button>
                        {platforms.map((p) => (
                          <button
                            key={p}
                            className={filterPlatform === p ? "active" : ""}
                            aria-pressed={filterPlatform === p}
                            onClick={() => setFilterPlatform(p)}
                          >
                            <PlatformMark platform={p} />
                            {platformNames[p]}
                            <span>{source.filter(c => c.platform === p).length}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="mobile-platform-label">Platform
                      <select className="mobile-platform" aria-label="Filter by platform" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)}>
                        <option value="all">All creators ({source.length})</option>
                        {platforms.map(p => <option key={p} value={p}>{platformNames[p]} ({source.filter(c => c.platform === p).length})</option>)}
                      </select>
                    </label>
                    <div className="filter-panel" role="group" aria-label="Creator filters">
                    <div className="filter-row">
                      <label className="search-filter"><span>Search creators</span><span className="filter-search">
                        <Search size={18} />
                        <input aria-label="Filter creators" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search name or bio" />
                      </span></label>
                      <div className="filter-selects">
                        <label className="topic-filter">
                          <span>Matched topic</span>
                          <select aria-label="Matched topic" value={topic} onChange={e => setTopic(e.target.value)}>
                            <option value="">Any matched topic</option>
                            {topics.map(term => <option key={term} value={term}>{term}</option>)}
                          </select>
                        </label>
                        <label>
                          <span>Sort by</span>
                          <select
                            aria-label="Sort creators"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            <option value="relevance">Content relevance</option>
                            <option value="audience">{filterPlatform === 'all' ? 'Audience size' : `${audienceUnit[0].toUpperCase()}${audienceUnit.slice(1)}`}</option>
                            <option value="email">Email available</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="evidence-filters">
                      <fieldset className="audience-range">
                        <legend>Audience size · {audienceUnit}</legend>
                        <div>
                          <label>Minimum<input type="number" inputMode="numeric" min="0" step="1" aria-label="Minimum audience" aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'audience-error' : undefined} placeholder="No minimum" value={minimum} onChange={e => setMinimum(e.target.value)} /></label>
                          <label>Maximum<input type="number" inputMode="numeric" min="0" step="1" aria-label="Maximum audience" aria-invalid={Boolean(rangeError)} aria-describedby={rangeError ? 'audience-error' : undefined} placeholder="No maximum" value={maximum} onChange={e => setMaximum(e.target.value)} /></label>
                        </div>
                      </fieldset>
                      <div className="filter-toggles">
                        <label className="email-toggle"><input type="checkbox" checked={emailOnly} onChange={e => setEmailOnly(e.target.checked)} />Has email</label>
                        <label className="email-toggle"><input type="checkbox" checked={matchingPostOnly} onChange={e => setMatchingPostOnly(e.target.checked)} />Has matching collected post</label>
                      </div>
                    </div>
                    {rangeError && <p id="audience-error" className="form-error" role="alert">{rangeError}</p>}
                    {matchingPostOnly && <p className="results-explanation">{topic ? `Requires a collected post matching “${topic}”. ` : ''}A bounded search can miss relevant posts. This is not an audience-fit score.</p>}
                    <div className="filtered-actions">
                      <span aria-live="polite" aria-atomic="true">Showing {visible.length} of {source.length} creators</span>
                      <button className="text-button" onClick={clearFilters}>Clear filters</button>
                      {view === 'discover' && <button className="secondary-button" disabled={!unsavedCount || Boolean(rangeError)} onClick={saveFiltered}><Bookmark size={15} />Save {unsavedCount} new creator{unsavedCount === 1 ? '' : 's'}</button>}
                    </div>
                    </div>
                    {collectingJobs.length > 0 && visible.length > 0 && <p className="collection-inline" role="status"><LoaderCircle size={16} className="spin" aria-hidden="true" />{collectingLabel} collection in progress. More results may arrive.</p>}
                    <div className="creator-grid">
                      {visible.map((c) => (
                        <article className="creator-card" key={c.id}>
                          <div className="creator-identity">
                            <Avatar creator={c} />
                            <div>
                              <span className="platform-label"><PlatformMark platform={c.platform} />{platformNames[c.platform]}</span>
                              <h3>
                                {c.name || c.handle}
                                {c.verified && <CheckCircle2 size={14} />}
                              </h3>
                              <span>@{c.handle.replace(/^@/, "")}</span>
                            </div>
                            <button className={`save-button ${shortlist.some(s => s.id === c.id) ? "saved" : ""}`} aria-label={`${shortlist.some(s => s.id === c.id) ? "Remove" : "Save"} ${c.name}`} aria-pressed={shortlist.some(s => s.id === c.id)} onClick={() => toggleSaved(c)}><Bookmark size={20} fill={shortlist.some(s => s.id === c.id) ? "currentColor" : "none"} /></button>
                          </div>
                          <p className="creator-bio">
                            {c.bio || (profilePending(c) ? 'Profile collection is pending. Review the discovery evidence.' : 'No bio returned. Review the discovery evidence.')}
                          </p>
                          {view === 'shortlist' && Object.hasOwn(notes, c.id) && notes[c.id] && <p className="card-note"><strong>Your note</strong>{notes[c.id]}</p>}
                          <button className="card-evidence" onClick={() => { setDetails(c); setScanError(""); }}>
                            <span className="evidence-label">{c.sample ? "Illustrative topic match" : relevanceLabel(c)}{c.matchedTerms.length > 0 && ` · ${c.matchedTerms.slice(0, 2).join(" / ")}`}</span>
                            <span className="evidence-excerpt">{contentSignals(c)[0]?.text || c.evidence.find(e => e.kind === "profile" && c.matchedTerms.some(term => matchesTopic(e.text, term)))?.text || c.evidence.find(e => e.kind === "search" && c.matchedTerms.some(term => matchesTopic(e.text, term)))?.text || c.evidence.find(e => e.kind === "profile" || e.kind === "search")?.text || c.evidence[0]?.text || "View profile evidence"}</span>
                            <ArrowRight size={18} />
                          </button>
                          <div className="card-data">
                            <div>
                              <strong>{formatCount(c.followers)}</strong>
                              <span>
                                {c.platform === "youtube"
                                  ? "subscribers"
                                  : "followers"}
                              </span>
                            </div>
                            <div
                              className={c.contacts.length ? "has-contact" : ""}
                            >
                              {c.contacts.length ? (
                                <>
                                  <strong>
                                    <span className="small-dot" />
                                    Public email
                                  </strong>
                                  <span>{c.sample ? "Illustrative source" : "Source available"}</span>
                                </>
                              ) : (
                                <>
                                  <strong>{profilePartial(c) ? 'Email unavailable · partial profile' : profilePending(c) ? 'Email collection pending' : profileUnknown(c) ? 'Email collection unknown' : 'No email found'}</strong>
                                  <span>
                                    {c.websites.length
                                      ? "Website available"
                                      : "Open profile to connect"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="card-bottom">
                            <span>
                              <span
                                className={`small-dot ${c.sample ? "sample" : "live"}`}
                              />
                              {c.sample
                                ? "Illustrative sample"
                                 : profilePartial(c)
                                   ? "Partial profile"
                                   : profilePending(c) ? "Profile collection pending" : profileUnknown(c) ? "Profile collection status unknown" : "Collected with Bright Data"}
                            </span>
                            <button
                              onClick={() => {
                                setDetails(c);
                                setScanError("");
                              }}
                            >
                              View details <ArrowRight size={13} />
                            </button>
                          </div>
                        </article>
                      ))}
                    </div>
                    {!visible.length && collectingJobs.length > 0 ? <div className="collection-wait" role="status">
                      <div className="scout-radar" aria-hidden="true"><span /><i /><b /></div>
                      <h3>{collectingLabel} collection in progress.</h3>
                      <p>{collectionStatus}</p>
                      <small>More profiles may arrive. Your filters apply as results come in.</small>
                    </div> : !visible.length && (filteredJobs.length > 0 || filteredFailure) ? <div className="empty-state small" role="status">
                      <Pause size={26} aria-hidden="true" />
                      <h3>{filteredFailure ? 'Collection needs attention.' : 'Collection is not running.'}</h3>
                      <p>{filteredFailure ? 'Collection did not finish successfully. Review the platform error above; an empty result is not a confirmed no-match outcome.' : 'These results are not final. Reconnect and resume the saved collection when ready.'}</p>
                    </div> : !visible.length && (
                      <div className="empty-state small">
                        <Search size={26} />
                        <h3>{filterPlatform !== 'all' && !source.some(c => c.platform === filterPlatform) ? `No ${platformNames[filterPlatform as Platform]} creators in this collection.` : 'No creators match these filters.'}</h3>
                        <p>
                          Try another platform or loosen your audience and email
                          filters.
                        </p>
                        <button
                          className="secondary-button"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      </div>
                    )}
                    <div className="results-footnote">
                      <ShieldCheck size={13} />
                      {source.some(c => c.sample)
                        ? "Sample data is fictional and intended to demonstrate the workspace."
                        : "Publicly collected data. Email availability does not confirm deliverability. Topic signals are keyword matches, not audience guarantees."}
                    </div>
                  </>
                )}
                {!source.length &&
                  !search.running &&
                  (view === "shortlist" ? (
                    <div className="empty-state">
                      <Bookmark size={32} />
                      <h3>Keep the creators worth a conversation.</h3>
                      <p>
                        Save a creator from discovery and they’ll be right here.
                        <br />
                        Your shortlist lives in this browser.
                      </p>
                      <button
                        className="primary-button"
                        onClick={() => go("discover")}
                      >
                        Find your people <ArrowRight size={16} />
                      </button>
                    </div>
                  ) : hasWork && !search.jobs.length ? <div className="empty-state">
                    <Search size={28} /><h3>{platforms.some(p => search.progress[p].phase === "error") ? "Collection needs attention." : "No matches in this collection."}</h3>
                    <p>{platforms.some(p => search.progress[p].phase === "error") ? "Review the platform errors above, then edit your brief when ready." : "Try a broader topic or another platform. A new collection uses Bright Data credits."}</p>
                    <button className="secondary-button" onClick={() => editSearch()}>Edit search</button>
                  </div> : null)}
              </section>
              {view === "discover" && !hasWork && <section className="journey" aria-label="How discovery works">
                <div><span>01</span><h3>Start with a topic.</h3><p>Choose your niche, platforms, and a focused collection depth.</p></div>
                <div><span>02</span><h3>See why they surfaced.</h3><p>Review public profiles, content evidence, and source-linked contacts.</p></div>
                <div><span>03</span><h3>Keep the good fits.</h3><p>Save creators in this browser. Export your shortlist as a CSV.</p></div>
              </section>}
            </>
          )}
          {search.storageWarning && (
            <p className="form-error" role="alert">
              {search.storageWarning}
            </p>
          )}
          {shortlistStorageWarning && <p className="form-error" role="alert">{shortlistStorageWarning}</p>}
          <footer className="page-footer">
            <span>Built by Yaron Been · Creator research with source evidence.</span>
            <div>
              <ProviderCredit />{" "}
              <span className="footer-separator">/</span>
              <button onClick={() => setHelp(true)}>
                Setup guide <ArrowUpRight size={12} />
              </button>
            </div>
          </footer>
        </main>
      </div>
      {keyModal && (
        <Modal
          feedback={toast}
          title={
            connected ? "Your Bright Data connection" : "Connect your Bright Data."
          }
          onClose={() => {
            if (!connecting) {
              setKeyModal(false);
              setKeyDraft("");
            }
          }}
        >
          {connected && <div className="connected-status"><CheckCircle2 size={20} /><div><strong>Key connected</strong><p>{metadataAvailable ? "Account metadata checked. Service permissions, credits, and zone health are checked when collection runs." : "Account metadata is unavailable. Check your key’s account-metadata permissions and reconnect to load zones. Service permissions, credits, and zone health are not confirmed."}</p></div></div>}
          <p className="modal-intro">
            Each visitor uses their own Bright Data key and pays for their own searches. Signal Scout does not provide a shared key or free live collection. Sample mode needs no key.
          </p>
          <form onSubmit={connect}>
            <label className="field-label" htmlFor="api-key">
              Bright Data API key
            </label>
            <input
              id="api-key"
              className="modal-input"
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder={
                connected
                  ? "Paste a key to replace your connection"
                  : "Paste your Bright Data API key"
              }
              required
              minLength={8}
              autoComplete="off"
              spellCheck={false}
            />
            <p className="key-help">
              <ShieldCheck size={14} />
              Kept only in this tab’s memory. On the public website, sent over HTTPS through the stateless relay to Bright Data; not saved to browser storage or the server. Refreshing or closing the tab clears your key.
            </p>
            {keyError && (
              <p className="form-error" role="alert">
                {keyError}
              </p>
            )}
            <button className="primary-button full-width" disabled={connecting}>
              {connecting ? (
                <>
                  <LoaderCircle size={16} className="spin" /> Checking
                  connection…
                </>
              ) : (
                <>
                  Connect Bright Data <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          <a
            className="get-key-link"
            href="https://brightdata.com/cp/setting/users"
            target="_blank"
            rel="noreferrer"
          >
            Find your API key in Bright Data <ExternalLink size={13} />
          </a>
          <details className="setup-disclosure">
            <summary>New to Bright Data? Open the step-by-step setup checklist</summary>
            <ProviderSetup />
          </details>
          <details className="connection-info" open>
            <summary>After connecting & resuming work</summary>
            <p>Choose your search zone in the form, enter 1–3 short topics, choose platforms and depth, then click Discover creators. Search and profile collection are separate paid stages; depth limits records, not a currency budget.</p>
            <small>
              Connecting checks account metadata without a paid search. It does not verify every product permission, your balance, or that the selected zone works. Collections can take several minutes; resume pending jobs rather than starting them again.
            </small>
            <p>After a refresh, reconnect your key and resume saved jobs. Resume can start separately billed post collection or a separately paid profile-enrichment stage; existing snapshot jobs are checked without resubmitting them. Results and job references are stored in this tab only and may be lost when you close the tab. Export results and retain snapshot IDs first. Submitted provider jobs may keep running and be billed after pausing.</p>
          </details>
          <p className="operator-note">Signal Scout is an open-source app built by Yaron Been. Bright Data provides the search and collection APIs. Your key passes through this app’s relay to Bright Data and is not saved.</p>
          {connected && (
            <button
              className="disconnect-button"
              disabled={search.running || scanning}
              onClick={() => {
                setKey("");
                setKeyDraft("");
                setConnected(false);
                 setUnlockerZone("");
                 setSearchZones([]);
                 setSearchZone("");
                setKeyModal(false);
                setToast("Bright Data disconnected");
              }}
            >
              Disconnect and forget key
            </button>
          )}
        </Modal>
      )}
      {help && (
        <Modal
          feedback={toast}
          title="From a signal to a shortlist."
          onClose={() => setHelp(false)}
        >
          <div className="tour-steps">
            {[
              [
                "01",
                "Connect your Bright Data key",
                "Use the checklist below to enable the required services. Enter your own key in the app. On this website it passes through the relay to Bright Data; your account pays for collection. Choose your search zone after connecting.",
              ],
              [
                "02",
                "Describe your ideal creator",
                "Enter up to three specific topics or keywords separated by commas. Start with focused depth.",
              ],
              [
                "03",
                "Inspect the evidence",
                "Bright Data finds YouTube/TikTok content by topic. Instagram/LinkedIn/X search both profiles and posts, collect bounded post evidence to identify authors, then enrich profiles. Matching authored posts rank above profile or search-only evidence.",
              ],
              [
                "04",
                "Keep the good fits",
                "Save creators, filter the results, and export a CSV with public emails and source links. Shortlists and briefs stay in this browser.",
              ],
            ].map(([n, title, description]) => (
              <div key={n}>
                <span className="step-number">{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="connection-info">
            <strong>Real data has gaps.</strong>
            <p>
              Some creators have no public email, some metrics aren’t visible,
              and platforms can fail independently. We show what was found and
              preserve useful partial results. Topic signals are transparent
              keyword matches.
            </p>
          </div>
          <ProviderSetup />
          <div className="connection-info">
            <strong>What each platform searches</strong>
            <ul className="discovery-methods">
              <li><strong>YouTube:</strong> keyword video search via Bright Data → deduplicate channels → collect channel profiles. Evidence comes from video titles/descriptions and profile text.</li>
              <li><strong>TikTok:</strong> keyword post search via Bright Data → deduplicate creators → collect profiles. Evidence comes from returned captions/descriptions and profile bios.</li>
              <li><strong>Instagram:</strong> Google topic searches for profiles and posts/reels → collect discovered posts with the Instagram scraper → identify their authors → collect profiles.</li>
              <li><strong>LinkedIn:</strong> Google topic searches for personal profiles and posts → collect posts with the LinkedIn scraper → identify personal-profile authors → collect profiles.</li>
              <li><strong>X:</strong> Google topic searches on the legacy twitter.com index for profiles and status pages → collect posts with the X scraper → identify authors → collect x.com profiles.</li>
            </ul>
            <p>No “creator” keyword is required and there is no dedicated hashtag crawler. Topic matches require every word of the term in one name, bio, or evidence item (not necessarily as an exact phrase). Matching collected posts rank first. Search-only matches stay labeled; Google indexing and bounded samples can miss relevant people.</p>
          </div>
          <div className="connection-info">
            <strong>Using the live website</strong>
            <p>No installation is needed. Connect your own key, choose your search zone, and search. No owner key is provided. After a refresh, reconnect your key and use Resume search. Resume can start separately billed post or profile stages; existing snapshots are checked without resubmission. Closing the tab may lose results and job references; export results and keep snapshot IDs first. Do not repeat an unresolved paid search until you check your Bright Data usage.</p>
          </div>
          <div className="local-instructions">
            <Terminal size={19} />
            <strong>Prefer to run it locally?</strong>
            <h3>For your coding agent</h3>
            <p>Open Claude Code, OpenCode, or Cursor and paste this. The agent starts the app and explains your remaining steps.</p>
            <code>{localSetupPrompt}</code>
            <button
              className="secondary-button"
              onClick={() =>
                copy(
                  localSetupPrompt,
                )
              }
            >
              <Copy size={14} /> Copy setup prompt
            </button>
            <h3>For you: once the agent finishes</h3>
            <ol>
              <li>Complete the Bright Data checklist above. The agent cannot supply your account, credits, or API key.</li>
              <li>Open <a href="http://localhost:8787" target="_blank" rel="noreferrer">http://localhost:8787</a>, click Connect Bright Data, and enter your key there.</li>
              <li>Select a working search zone for Instagram, LinkedIn & X, choose topics/platforms, and start your search.</li>
              <li>Keep the local server running. If you refresh, reconnect your key and resume saved jobs. Resume can start separately billed post or profile stages; existing snapshots are checked without resubmission.</li>
              <li>Before closing the tab, export results and keep snapshot IDs. Tab-local results and job references may be lost after closing; submitted Bright Data jobs may still run and be billed.</li>
            </ol>
            <p>Local prerequisites: Git and Node.js 22+. No Cloudflare login is required locally. You can explore a fictional sample without a key.</p>
          </div>
        </Modal>
      )}
      {details && (
        <Modal
          feedback={keyModal ? "" : toast}
          title="Creator intelligence"
          onClose={() => {
            if (!scanning) setDetails(null);
          }}
          wide
        >
          <div className="detail-identity">
            <Avatar creator={details} large />
            <div>
              <span className="platform-label">
                <PlatformMark platform={details.platform} />
                {platformNames[details.platform]}
              </span>
              <h2>{details.name}</h2>
              <span>
                @{details.handle.replace(/^@/, "")}
                {details.location && ` · ${details.location}`}
              </span>
            </div>
            <button
              className={`secondary-button ${shortlist.some((s) => s.id === details.id) ? "is-saved" : ""}`}
              onClick={() => toggleSaved(details)}
            >
              <Bookmark size={15} />
              {shortlist.some((s) => s.id === details.id)
                ? "Saved"
                : "Save creator"}
            </button>
          </div>
          {details.sample && (
            <div className="sample-notice">
              <Sparkles size={15} />
              Fictional sample profile. Links and contacts are illustrative.
            </div>
          )}
          {!details.sample && (profilePartial(details) || profilePending(details) || profileUnknown(details)) && <p className="collection-state">{profilePartial(details) ? "Partial profile · enrichment did not complete" : profilePending(details) ? "Profile collection pending · discovery evidence is available" : "Profile collection status unknown · restored evidence remains available"}</p>}
          <p className="detail-bio">
            {details.bio || "No public bio was returned."}
          </p>
          {shortlist.some(c => c.id === details.id) && <ShortlistNote key={details.id} value={Object.hasOwn(notes, details.id) ? notes[details.id] : ''} onSave={note => saveNote(details.id, note)} />}
          {details.enrichmentError && (
            <p className="form-error">{details.enrichmentError}</p>
          )}
          <div className="detail-stats">
            <div>
              <strong>{formatCount(details.followers)}</strong>
              <span>
                {details.platform === "youtube" ? "subscribers" : "followers"}
              </span>
            </div>
            <div>
              <strong>{!details.sample && !details.contacts.length && (profilePartial(details) || profilePending(details) || profileUnknown(details)) ? profilePending(details) ? "Pending" : "Unknown" : details.contacts.length}</strong>
              <span>public emails found</span>
            </div>
            <div>
              <strong>{details.matchedTerms.length}</strong>
              <span>matching search terms</span>
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">
              <Eye size={17} /><h3>Why they surfaced</h3><span>{details.sample ? "ILLUSTRATIVE EVIDENCE" : "COLLECTED EVIDENCE"}</span>
            </div>
            {details.matchedTerms.length > 0 && <div className="detail-terms">{details.matchedTerms.map(t => <span key={t}><Sparkles size={12} />{t}</span>)}</div>}
            {details.evidence.slice(0, 5).map((e, i) => <div className="evidence-row" key={i}>
              <span>{e.kind === "search" ? "Search result" : e.kind === "content" ? "Collected content" : "Public profile"}</span>
              {e.publishedAt && <span> · {new Date(e.publishedAt).toLocaleDateString()}</span>}
              <p>{e.text.slice(0, 1000)}</p>
              {!details.sample && <a href={safeUrl(e.url)} target="_blank" rel="noreferrer">Open evidence <ArrowUpRight size={14} /></a>}
            </div>)}
            {!details.evidence.length && <p className="no-contact">No discovery evidence was returned for this profile.</p>}
            <small>Topic signals are literal matches in collected text, not a prediction of audience fit or campaign performance.</small>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">
              <Mail size={17} />
              <h3>Contact signals</h3>
              <span>PUBLIC SOURCES</span>
            </div>
            {details.contacts.length ? (
              details.contacts.map((c) => (
                <div className="contact-row" key={c.email}>
                  <div>
                    <strong>{c.email}</strong>
                    <span>{c.source} · Not mailbox-verified</span>
                    {!details.sample && (
                      <a
                        href={safeUrl(c.sourceUrl)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View source <ArrowUpRight size={11} />
                      </a>
                    )}
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Copy ${c.email}`}
                    onClick={() => copy(c.email)}
                  >
                    <Copy size={17} />
                  </button>
                </div>
              ))
            ) : (
              <p className="no-contact">
                {profilePartial(details) ? "Email collection is incomplete because profile enrichment failed. Review the partial evidence and collection recovery." : profilePending(details) ? "Email collection is pending. Review the discovery evidence while profile collection completes." : profileUnknown(details) ? "Email collection status is unknown for this restored profile. Review the available evidence; a new collection uses Bright Data credits." : "No public email found in the collected profile or content. A profile or website can still be a useful starting point."}
              </p>
            )}
            {details.websites.length > 0 && (
              <div className="website-row">
                <Globe2 size={16} />
                <span>{details.websites[0]}</span>
                {!details.sample && (
                  <a
                    href={safeUrl(details.websites[0])}
                    target="_blank"
                    rel="noreferrer"
                    aria-label="Open creator website"
                  >
                    <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            )}
            {!details.sample && details.websites.length > 0 && (
              <>
                <button
                  className="secondary-button"
                  disabled={scanning || (connected && !unlockerZone)}
                  onClick={() => scan(details)}
                >
                  {scanning ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <Search size={15} />
                  )}
                  Scan public website for email
                </button>
                <small className="scan-note">
                  One additional Bright Data Web Unlocker request; usage billed
                  to your account.
                  {connected &&
                    !unlockerZone &&
                    (metadataAvailable
                      ? " Enable a Web Unlocker zone in Bright Data to use this feature."
                      : " Account metadata is unavailable, so your Web Unlocker zones could not be loaded. Check your key’s account-metadata permissions and reconnect.")}
                </small>
              </>
            )}
            {shortlistStorageWarning && <p ref={shortlistWarningRef} className="form-error" role="alert">{shortlistStorageWarning}</p>}
            {scanError && (
              <p className="form-error" role="alert">
                {scanError}
              </p>
            )}
          </div>
          <div className="detail-bottom">
            <span>
              {details.sample
                ? "Illustrative sample"
                : `Collected ${new Date(details.collectedAt).toLocaleDateString()}`}
            </span>
            {!details.sample && (
              <a
                className="primary-button"
                href={safeUrl(details.url)}
                target="_blank"
                rel="noreferrer"
              >
                Open {platformNames[details.platform]} profile{" "}
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </Modal>
      )}
      {reconcile && (
        <Modal
          feedback={toast}
          title="Reconnect an existing collection"
          onClose={() => setReconcile(null)}
        >
          <p className="modal-intro">
            Open your Bright Data dashboard and find the{" "}
            {platformNames[reconcile]} collection submitted by this search.
            Match the stage shown in the recovery banner. Paste its snapshot ID to check the same job without submitting it again. After discovery or post collection, profile enrichment is a separate paid collection.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              search.reconcileJob(reconcile, snapshotDraft.trim());
              setReconcile(null);
            }}
          >
            <label className="field-label" htmlFor="snapshot-reference">
              Snapshot ID
            </label>
            <input
              className="modal-input"
              id="snapshot-reference"
              value={snapshotDraft}
              onChange={(e) => setSnapshotDraft(e.target.value)}
              placeholder="sd_…"
              pattern="s[dn]_[a-zA-Z0-9]{5,80}"
              required
            />
            <button
              className="primary-button full-width"
              style={{ marginTop: 16 }}
            >
              Save job reference <ArrowRight size={16} />
            </button>
          </form>
          <a
            className="get-key-link"
            href="https://brightdata.com/cp/scrapers"
            target="_blank"
            rel="noreferrer"
          >
            Open Bright Data scrapers <ExternalLink size={13} />
          </a>
        </Modal>
      )}
      {toast && !keyModal && !help && !details && !reconcile && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
