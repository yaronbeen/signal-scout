import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Eye,
  Globe2,
  HelpCircle,
  History,
  KeyRound,
  Layers3,
  LoaderCircle,
  Mail,
  Menu,
  Pause,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Users,
  X as Close,
} from "lucide-react";
import { api } from "./api";
import { formatCount, safeUrl, toCsv } from "./data";
import {
  isConfig,
  load,
  recentSearches,
  savedCreators,
  store,
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

type View = "discover" | "shortlist" | "history";
function ProviderCredit() {
  return <a className="provider-credit" href="https://brightdata.com" target="_blank" rel="noreferrer"><span>Powered by</span><strong className="brand-wordmark">Bright Data</strong><ArrowUpRight size={12} /></a>;
}
function ProviderSetup() {
  return <section className="provider-setup" aria-label="Bright Data setup steps">
    <h3>Your Bright Data checklist</h3>
    <ol>
      <li><strong>Create your account and check credits.</strong> Live searches are billed to your Bright Data account. <a href="https://brightdata.com" target="_blank" rel="noreferrer">Create an account</a> · <a href="https://brightdata.com/pricing" target="_blank" rel="noreferrer">Check pricing</a></li>
      <li><strong>Enable Web Scraper API access for your key.</strong> Required to collect creator profiles on all five platforms and discover YouTube/TikTok content. <a href="https://docs.brightdata.com/scraping-automation/web-scraper-api/overview" target="_blank" rel="noreferrer">Web Scraper API guide</a></li>
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
      {creator.avatar && !failed ? (
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
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <Close size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function RadarArt() {
  return (
    <div className="radar-art" aria-hidden="true">
      <div className="radar-grid" />
      <div className="radar-sweep" />
      <div className="radar-orbit orbit-one" />
      <div className="radar-orbit orbit-two" />
      <div className="radar-orbit orbit-three" />
      <div className="radar-core">
        <Radio size={32} />
      </div>
      <span className="radar-coordinate coordinate-top">DISCOVERY ENGINE / 01</span>
      <span className="radar-coordinate coordinate-bottom">FIVE NETWORKS. ONE CLEAR VIEW.</span>
      <div className="radar-live-card"><span className="radar-live-icon"><Users size={17} /></span><div><strong>Follow the signal</strong><span>Profiles · Public contacts · Evidence</span></div><span className="radar-status-dot" /></div>
      <div className="radar-person person-one">
        MC
        <span>
          <PlatformMark platform="youtube" />
        </span>
      </div>
      <div className="radar-person person-two">
        AR
        <span>
          <PlatformMark platform="instagram" />
        </span>
      </div>
      <div className="radar-person person-three">
        PK
        <span>
          <PlatformMark platform="linkedin" />
        </span>
      </div>
      <div className="radar-pill">
        <span className="pulse-dot" /> Less noise. More signal.
      </div>
      <span className="art-spark one">✦</span>
      <span className="art-spark two">✦</span>
    </div>
  );
}
export default function App() {
  const search = useSearch();
  const [view, setView] = useState<View>("discover");
  const [sidebar, setSidebar] = useState(false);
  const [key, setKey] = useState("");
  const [connected, setConnected] = useState(false);
  const [unlockerZone, setUnlockerZone] = useState("");
  const [searchAvailable, setSearchAvailable] = useState(true);
  const [searchZones, setSearchZones] = useState<string[]>([]);
  const [searchZone, setSearchZone] = useState("");
  const [keyModal, setKeyModal] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [keyError, setKeyError] = useState("");
  const [help, setHelp] = useState(false);
  const [brief, setBrief] = useState("");
  const [terms, setTerms] = useState("");
  const [companyMode, setCompanyMode] = useState(false);
  const [selected, setSelected] = useState<Platform[]>([...platforms]);
  const [depth, setDepth] = useState(5);
  const [formError, setFormError] = useState("");
  const [shortlist, setShortlist] = useState<Creator[]>(savedCreators);
  const [history, setHistory] = useState<SearchConfig[]>(recentSearches);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [emailOnly, setEmailOnly] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("relevance");
  const [minimum, setMinimum] = useState(0);
  const [details, setDetails] = useState<Creator | null>(null);
  const [toast, setToast] = useState("");
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
      store("shortlist", next);
      return next;
    });
    setDetails(current => {
      const fresh = current && updates.get(current.id);
      return current && fresh ? { ...fresh, contacts: [...fresh.contacts, ...current.contacts.filter(c => !fresh.contacts.some(n => n.email === c.email))] } : current;
    });
  }, [search.creators]);
  const resultsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!search.running) return;
    const start = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [search.running]);
  function go(next: View) {
    setView(next);
    setSidebar(false);
    setFilter("");
    setFilterPlatform("all");
    setEmailOnly(false);
    setMinimum(0);
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
      }>("connect", keyDraft.trim(), {});
      setKey(keyDraft.trim());
      setConnected(true);
      setUnlockerZone(response.unlockerZone);
      setSearchAvailable(response.searchAvailable);
      const zones = response.searchZones || [];
      setSearchZones(zones);
      setSearchZone(current => zones.includes(current) ? current : zones[0] || "");
      setKeyDraft("");
      setKeyModal(false);
      setToast(response.searchAvailable ? "Key connected. Choose your search zone before searching. Service access and credits are checked when collection runs." : "Key connected. Set up a search zone for Instagram, LinkedIn & X. YouTube/TikTok require Web Scraper API access and credits.");
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setConnecting(false);
    }
  }
  function config(): SearchConfig | null {
    const keywords = (companyMode ? terms : terms || brief)
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!brief.trim()) {
      setFormError("Add a topic or company to start your search.");
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
    setLastBrief(c.brief);
    setElapsed(0);
    setFilterPlatform("all");
    setEmailOnly(false);
    setFilter("");
    const next = [c, ...history.filter((h) => h.brief !== c.brief)].slice(
      0,
      15,
    );
    setHistory(next);
    store("history", next);
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
    await search.start(c, key, false, searchZone);
  }
  function demo() {
    if (search.running || search.jobs.length) return;
    setSample(true);
    setLastBrief("AI tools & automation");
    setBrief("AI tools, automation");
    setTerms("");
    setCompanyMode(false);
    search.showSample(sampleCreators);
    go("discover");
    setTimeout(
      () =>
        resultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      100,
    );
  }
  function download(data: Creator[]) {
    const url = URL.createObjectURL(
      new Blob([toCsv(data)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `signal-scout-${view === "shortlist" ? "shortlist" : "creators"}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setToast(`Exported ${data.length} creator${data.length === 1 ? "" : "s"}`);
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
        store("shortlist", next); return next;
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
  const visible = source
    .filter(
      (c) =>
        (filterPlatform === "all" || c.platform === filterPlatform) &&
        (!emailOnly || c.contacts.length > 0) &&
        (!minimum || (c.followers !== null && c.followers >= minimum)) &&
        `${c.name} ${c.handle} ${c.bio}`
          .toLowerCase()
          .includes(filter.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "audience"
        ? (b.followers ?? -1) - (a.followers ?? -1)
        : sort === "email"
          ? Number(b.contacts.length > 0) - Number(a.contacts.length > 0)
          : b.matchedTerms.length - a.matchedTerms.length,
    );
  const emailCount = source.filter((c) => c.contacts.length).length;
  const usedPlatforms = new Set(source.map((c) => c.platform)).size;
  const done = platforms.filter(
    (p) => search.progress[p].phase === "done",
  ).length;
  const hasProgress = platforms.some(
    (p) => search.progress[p].phase !== "idle",
  );
  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "open" : ""}`}>
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
        <div className="workspace">
          <span className="workspace-avatar">Y</span>
          <div>
            <strong>Your workspace</strong>
            <small>Saved in this browser</small>
          </div>
          <span className="local-tag">BROWSER</span>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "discover" ? "active" : ""}
            onClick={() => go("discover")}
          >
            <Compass size={19} /> Discover creators
            <ArrowUpRight className="nav-arrow" size={15} />
          </button>
          <button
            className={view === "shortlist" ? "active" : ""}
            onClick={() => go("shortlist")}
          >
            <Bookmark size={19} /> Your shortlist
            <span className="nav-count">{shortlist.length}</span>
          </button>
          <button
            className={view === "history" ? "active" : ""}
            onClick={() => go("history")}
          >
            <History size={19} /> Recent searches
          </button>
        </nav>
        <div className="sidebar-guide">
          <div className="mini-orbits">
            <Sparkles size={21} />
          </div>
          <strong>
            Your next great partnership
            <br />
            starts with a signal.
          </strong>
          <p>
            Real profiles. Public contacts.
            <br />
            Your own data, on your terms.
          </p>
          <button onClick={() => setHelp(true)}>
            Take a quick tour <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button onClick={() => setHelp(true)}>
            <HelpCircle size={18} /> How it works
          </button>
          <a
            href="https://github.com/yaronbeen/signal-scout"
            target="_blank"
            rel="noreferrer"
          >
            <Terminal size={18} /> Run it locally <ArrowUpRight size={13} />
          </a>
          <div className="powered">
            <ProviderCredit />
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={22} />
            </button>
            <span>Workspace</span>
            <span className="crumb-slash">/</span>
            <strong>
              {view === "discover"
                ? "Discover creators"
                : view === "shortlist"
                  ? "Your shortlist"
                  : "Recent searches"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="byok-tag">
              <ShieldCheck size={14} /> Bring your own key
            </span>
            <button
              className={`connect-button ${connected ? "connected" : ""}`}
              onClick={() => {
                setKeyError("");
                setKeyModal(true);
              }}
            >
              {connected ? <CheckCircle2 size={15} /> : <KeyRound size={15} />}
              {connected ? "Bright Data connected" : "Connect Bright Data"}
              <span className={`connection-dot ${connected ? "on" : ""}`} />
            </button>
          </div>
        </header>
        <main>
          {view === "discover" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <div className="eyebrow">
                    <span /> FIVE-PLATFORM CREATOR RESEARCH
                  </div>
                  <h1>
                    Find your people.
                    <br />
                    <span>Make some noise.</span>
                  </h1>
                  <p>
                    Discover creators across five platforms with Bright Data.
                    <br className="desktop-break" /> Review profile evidence, find public emails,
                    and export your shortlist.
                  </p>
                  <div className="provider-strip"><ProviderCredit /></div>
                  <p className="hero-setup-note">Live searches require your own Bright Data account, API key and credits. <button type="button" onClick={() => setHelp(true)}>Setup guide</button></p>
                  <div className="hero-meta">
                    <span>
                      <span className="tiny-stack">
                        <PlatformMark platform="youtube" />
                        <PlatformMark platform="instagram" />
                        <PlatformMark platform="tiktok" />
                      </span>{" "}
                      5 platforms. One search.
                    </span>
                    <span className="meta-divider" />
                    <span>
                      <ShieldCheck size={15} /> Your key. Your data.
                    </span>
                  </div>
                </div>
                <RadarArt />
              </section>
              <form className="search-panel" onSubmit={begin}>
                <div className="search-panel-heading">
                  <div>
                    <span className="step-number">01</span>
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
                <div
                  className="input-mode"
                  role="group"
                  aria-label="Search type"
                >
                  <button
                    type="button"
                    className={!companyMode ? "selected" : ""}
                    onClick={() => {
                      setCompanyMode(false);
                      setTerms("");
                    }}
                  >
                    Topic or keyword
                  </button>
                  <button
                    type="button"
                    className={companyMode ? "selected" : ""}
                    onClick={() => {
                      setCompanyMode(true);
                      setTerms("");
                    }}
                  >
                    Company or brand
                  </button>
                </div>
                <label className="search-input-wrap">
                  <Search size={21} />
                  <input
                    aria-label={
                      companyMode ? "Company or brand" : "Topic or keyword"
                    }
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    maxLength={240}
                    placeholder={
                      companyMode
                        ? "Your company or brand name"
                        : "Try “AI tools”, “sustainable skincare”, or “B2B marketing”"
                    }
                    disabled={search.running}
                  />
                  <span className="input-hint">
                    {companyMode ? "BRAND" : "TOPIC"}
                  </span>
                </label>
                {companyMode && (
                  <div className="brand-terms">
                    <label htmlFor="terms">
                        Which topics or audiences should we search for?
                    </label>
                    <input
                      id="terms"
                      value={terms}
                      onChange={(e) => setTerms(e.target.value)}
                      placeholder="e.g. AI automation, SaaS founders"
                      maxLength={300}
                      disabled={search.running}
                    />
                    <small>
                        Your company name labels this research. These terms guide discovery; separate up to 3 short topics with commas.
                    </small>
                  </div>
                )}
                {!companyMode && (
                  <div className="suggestions">
                    <span>A little inspiration:</span>
                    {[
                      "AI & automation",
                      "Skincare creators",
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
                          setTerms("");
                        }}
                      >
                        {s} <ArrowUpRight size={11} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="search-options">
                  <div className="platform-options">
                    <label>Search across</label>
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
                  </div>
                  <div className="depth-option">
                    <label htmlFor="depth">Search depth</label>
                    <div className="select-wrap">
                      <select
                        id="depth"
                        value={depth}
                        disabled={search.running}
                        onChange={(e) => setDepth(Number(e.target.value))}
                      >
                        <option value={5}>
                          Focused · up to 5 / platform
                        </option>
                        <option value={10}>
                          Balanced · up to 10 / platform
                        </option>
                        <option value={20}>
                          Broader · up to 20 / platform
                        </option>
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                </div>
                {connected && searchZones.length > 0 && (
                  <div className="search-zone-option">
                    <label htmlFor="search-zone">Bright Data search zone · Instagram, LinkedIn & X</label>
                    <select id="search-zone" value={searchZone} disabled={search.running} onChange={e => setSearchZone(e.target.value)}>
                      {searchZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                    </select>
                    <small>If search fails, check this zone’s settings. Selecting another zone does not repeat any paid request.</small>
                  </div>
                )}
                <div className="search-footer">
                  <span>
                    <ShieldCheck size={14} />
                    Public data only. Usage billed to your Bright Data account.
                  </span>
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
                <p className="usage-summary">
                  Collect up to {depth} creator profiles per platform. YouTube and TikTok review up to {depth} posts per topic; other platforms search one results page per topic. Search and profile collection use separate Bright Data credits. <a href="https://brightdata.com/pricing" target="_blank" rel="noreferrer">View pricing <ArrowUpRight size={11} /></a>
                </p>
                {connected && !searchAvailable && (
                  <p className="form-error">
                    No active search zone found. For Instagram, LinkedIn, and X, <a href="https://docs.brightdata.com/scraping-automation/serp-api/quickstart" target="_blank" rel="noreferrer">set up Bright Data’s search API</a>, then reconnect. YouTube and TikTok can run separately with Web Scraper API access and credits.
                  </p>
                )}
                {formError && (
                  <p className="form-error" role="alert">
                    {formError}
                  </p>
                )}
              </form>
              {search.jobs.length > 0 && !search.running && (
                <div className="resume-banner">
                  <History size={20} />
                  <div>
                    <strong>
                      You have {search.jobs.length} unfinished platform
                      collection(s).
                    </strong>
                    <span>
                      Continue saved work. Profiles ready for enrichment start a separate paid collection. Pausing or discarding references does not cancel Bright Data jobs; submitted jobs may still be billed.
                    </span>
                    {search.jobs
                      .filter((j) => j.stage === "uncertain")
                      .map((j) => (
                        <div className="uncertain-job" key={j.platform}>
                          <strong>
                            {platformNames[j.platform]}: submission needs
                            checking.
                          </strong>
                          <span>
                            {j.uncertainStage === 'search' ? 'The search may already have used credits. Review account usage before choosing to repeat it.' : 'Find the submitted job in your Bright Data dashboard, then add its snapshot ID. An uncertain submission is never repeated automatically.'}
                          </span>
                          <button
                            className="secondary-button"
                            onClick={() => {
                              if (j.uncertainStage === 'search') { if (window.confirm('Repeat this paid search? The earlier request may already have used Bright Data credits.')) search.retrySearch(j.platform); }
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
                    disabled={search.jobs.every((j) => j.stage === "uncertain")}
                    onClick={() => {
                      if (!connected) setKeyModal(true);
                      else {
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
              {(hasProgress || search.running) && (
                <section
                  className="progress-panel"
                  aria-label="Collection progress"
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
                          ? `${Math.floor(elapsed / 60)}m ${elapsed % 60}s · ${done}/${selected.length} platforms complete`
                          : "Each platform is collected independently"}
                      </span>
                    </div>
                    {search.running && (
                      <button className="text-button" onClick={search.pause}>
                        <Pause size={14} /> Pause search
                      </button>
                    )}
                  </div>
                  <div className="progress-platforms">
                    {platforms
                      .filter(
                        (p) =>
                          search.progress[p].phase !== "idle" ||
                          selected.includes(p),
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
                        setBrief(h.brief);
                        setTerms(h.keywords.join(", "));
                        setSelected(h.platforms);
                        setDepth(h.depth);
                        setCompanyMode(true);
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
                      <ArrowUpRight size={20} />
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
                className={`results-section ${view === "shortlist" ? "standalone-view" : ""}`}
                ref={resultsRef}
              >
                <div className="results-heading">
                  <div>
                    {view === "shortlist" && (
                      <div className="eyebrow">GOOD FITS, ALL IN ONE PLACE</div>
                    )}
                    <h2>
                      {view === "shortlist"
                        ? "Your next partnerships."
                        : source.length || search.running
                          ? "Meet your next collaborators."
                          : hasProgress ? "No creator profiles to show yet." : "A better way to find your fit."}
                    </h2>
                    <p>
                      {view === "shortlist" ? (
                        "Your saved creators. Ready when you are."
                      ) : source.length ? (
                        <>
                          Signals for <strong>{lastBrief}</strong>{" "}
                          <span className="results-subdot">·</span>{" "}
                          {sample
                            ? "Illustrative sample"
                            : "Live Bright Data collection"}
                        </>
                      ) : (
                        hasProgress ? "Check the platform outcomes above. Broaden topics for no matches, or resolve the collection error and resume saved work." : "From a topic to a shortlist. All the context you need, none of the busywork."
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
                {source.length > 0 && (
                  <>
                    {source.some((c) => c.sample) && (
                      <div className="sample-notice">
                        <Sparkles size={16} />
                        <strong>Sample workspace</strong>
                        <span>
                          Fictional creators and illustrative metrics. Connect
                          your key to collect real profiles.
                        </span>
                      </div>
                    )}
                    <div className="stats-strip">
                      <div>
                        <span className="stat-icon">
                          <Users size={20} />
                        </span>
                        <div>
                          <strong>
                            {source.length}
                            <small>creators discovered</small>
                          </strong>
                        </div>
                        <span className="stat-detail">
                          A world of potential
                        </span>
                      </div>
                      <div>
                        <span className="stat-icon green">
                          <Mail size={20} />
                        </span>
                        <div>
                          <strong>
                            {emailCount}
                            <small>with public email</small>
                          </strong>
                        </div>
                        <span className="stat-detail">
                          Source-linked contacts
                        </span>
                      </div>
                      <div>
                        <span className="stat-icon violet">
                          <Layers3 size={20} />
                        </span>
                        <div>
                          <strong>
                            {usedPlatforms}
                            <small>platforms represented</small>
                          </strong>
                        </div>
                        <span className="stat-detail">One unified view</span>
                      </div>
                    </div>
                    <div className="results-toolbar">
                      <div
                        className="platform-tabs"
                        role="group"
                        aria-label="Filter by platform"
                      >
                        <button
                          className={filterPlatform === "all" ? "active" : ""}
                          onClick={() => setFilterPlatform("all")}
                        >
                          All creators <span>{source.length}</span>
                        </button>
                        {platforms.map((p) => (
                          <button
                            key={p}
                            className={filterPlatform === p ? "active" : ""}
                            onClick={() => setFilterPlatform(p)}
                          >
                            <PlatformMark platform={p} />
                            {platformNames[p]}
                          </button>
                        ))}
                      </div>
                      <label className="email-toggle">
                        <input
                          type="checkbox"
                          checked={emailOnly}
                          onChange={(e) => setEmailOnly(e.target.checked)}
                        />
                        <span />
                        Has email
                      </label>
                    </div>
                    <div className="filter-row">
                      <label className="filter-search">
                        <Search size={15} />
                        <input
                          aria-label="Filter creators"
                          value={filter}
                          onChange={(e) => setFilter(e.target.value)}
                          placeholder="Filter by name or bio…"
                        />
                      </label>
                      <div className="filter-selects">
                        <label>
                          <SlidersHorizontal size={14} />
                          <select
                            aria-label="Minimum audience"
                            value={minimum}
                            onChange={(e) => setMinimum(Number(e.target.value))}
                          >
                            <option value={0}>Any audience size</option>
                            <option value={1000}>1K+ followers</option>
                            <option value={10000}>10K+ followers</option>
                            <option value={100000}>100K+ followers</option>
                          </select>
                        </label>
                        <label>
                          <span>Sort:</span>
                          <select
                            aria-label="Sort creators"
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                          >
                            <option value="relevance">Topic signals</option>
                            <option value="audience">Audience size</option>
                            <option value="email">Email available</option>
                          </select>
                        </label>
                      </div>
                    </div>
                    <div className="creator-grid">
                      {visible.map((c) => (
                        <article className="creator-card" key={c.id}>
                          <div className="card-top">
                            <span className="platform-label">
                              <PlatformMark platform={c.platform} />
                              {platformNames[c.platform]}
                            </span>
                            <button
                              className={`save-button ${shortlist.some((s) => s.id === c.id) ? "saved" : ""}`}
                              aria-label={`${shortlist.some((s) => s.id === c.id) ? "Remove" : "Save"} ${c.name}`}
                              onClick={() => toggleSaved(c)}
                            >
                              <Bookmark
                                size={18}
                                fill={
                                  shortlist.some((s) => s.id === c.id)
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>
                          </div>
                          <div className="creator-identity">
                            <Avatar creator={c} />
                            <div>
                              <h3>
                                {c.name || c.handle}
                                {c.verified && <CheckCircle2 size={14} />}
                              </h3>
                              <span>@{c.handle.replace(/^@/, "")}</span>
                            </div>
                          </div>
                          <p className="creator-bio">
                            {c.bio || (view === 'discover' && search.jobs.some(j => j.platform === c.platform) ? 'Profile collection is pending. Review the discovery evidence.' : 'No bio returned. Review the discovery evidence.')}
                          </p>
                          <div className="creator-signals">
                            {c.matchedTerms.length ? (
                              <>
                                <span className="signal-spark">
                                  <Sparkles size={11} />
                                </span>
                                {c.matchedTerms.slice(0, 2).map((t) => (
                                  <span key={t}>{t}</span>
                                ))}
                              </>
                            ) : (
                              <span className="review-fit">
                                Review discovery evidence for fit
                              </span>
                            )}
                          </div>
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
                                  <span>Source available</span>
                                </>
                              ) : (
                                <>
                                  <strong>{view === 'discover' && search.jobs.some(j => j.platform === c.platform) ? 'Email collection pending' : 'No email found'}</strong>
                                  <span>
                                    {c.websites.length
                                      ? "Website available"
                                      : "Open profile to connect"}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            className="card-evidence"
                            onClick={() => {
                              setDetails(c);
                              setScanError("");
                            }}
                          >
                            <span className="evidence-icon">
                              <Eye size={14} />
                            </span>
                            <span>
                              {c.evidence.find(
                                (e) =>
                                  e.kind === "content" || e.kind === "search",
                              )?.text || "View profile evidence"}
                            </span>
                            <ArrowUpRight size={15} />
                          </button>
                          <div className="card-bottom">
                            <span>
                              <span
                                className={`small-dot ${c.sample ? "sample" : "live"}`}
                              />
                              {c.sample
                                ? "Illustrative sample"
                                : c.enrichmentError
                                  ? "Partial profile"
                                  : "Collected with Bright Data"}
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
                    {!visible.length && (
                      <div className="empty-state small">
                        <Search size={26} />
                        <h3>No creators match these filters.</h3>
                        <p>
                          Try another platform or loosen your audience and email
                          filters.
                        </p>
                        <button
                          className="secondary-button"
                          onClick={() => {
                            setFilter("");
                            setFilterPlatform("all");
                            setEmailOnly(false);
                            setMinimum(0);
                          }}
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
                  ) : (
                    <div className="how-grid" hidden={hasProgress}>
                      <div>
                        <div className="how-icon">
                          <Compass size={25} />
                          <span>01</span>
                        </div>
                        <h3>Start with a signal</h3>
                        <p>
                          A niche, a keyword, or your brand.
                          <br />
                          Tell us what a good fit looks like.
                        </p>
                      </div>
                      <div>
                        <div className="how-icon">
                          <Radio size={25} />
                          <span>02</span>
                        </div>
                        <h3>Go beyond the handle</h3>
                        <p>
                          Real profiles, audience counts, and
                          <br />
                          public contacts. Collected live.
                        </p>
                      </div>
                      <div>
                        <div className="how-icon">
                          <Bookmark size={25} />
                          <span>03</span>
                        </div>
                        <h3>Make your shortlist</h3>
                        <p>
                          Save the standouts. Export the data.
                          <br />
                          Your next partnership starts here.
                        </p>
                      </div>
                    </div>
                  ))}
              </section>
            </>
          )}
          {search.storageWarning && (
            <p className="form-error" role="alert">
              {search.storageWarning}
            </p>
          )}
          <footer className="page-footer">
            <span>Built by Yaron Been · Creator research with source evidence.</span>
            <div>
              <ProviderCredit />{" "}
              <span className="footer-separator">/</span>
              <button onClick={() => setHelp(true)}>
                How it works <ArrowUpRight size={12} />
              </button>
            </div>
          </footer>
        </main>
      </div>
      {keyModal && (
        <Modal
          title={
            connected ? "Your Bright Data connection" : "Connect your own Bright Data account"
          }
          onClose={() => {
            if (!connecting) {
              setKeyModal(false);
              setKeyDraft("");
            }
          }}
        >
          <div className="connect-art">
            <KeyRound size={28} />
            <span>YOUR KEY. YOUR ACCOUNT. YOUR USAGE.</span>
          </div>
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
              Kept only in this tab’s memory. Sent over HTTPS through this website’s relay to Bright Data; not saved to browser storage or the server. Refreshing or closing the tab clears it.
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
          <div className="connection-info">
            <strong>After you connect</strong>
            <p>Choose your search zone in the form, enter 1–3 short topics, choose platforms and depth, then click Discover creators. Search and profile collection are separate paid stages; depth limits records, not a currency budget.</p>
            <small>
              Connecting checks account metadata without a paid search. It does not verify every product permission, your balance, or that the selected zone works. Collections can take several minutes; resume pending jobs rather than starting them again.
            </small>
          </div>
          <p className="operator-note">Signal Scout is an open-source app built by Yaron Been. Bright Data provides the search and collection APIs. Your key passes through this app’s relay to Bright Data and is not saved.</p>
          {connected && (
            <button
              className="disconnect-button"
              disabled={search.running || scanning}
              onClick={() => {
                setKey("");
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
                "Use up to three specific topics. For a company search, add the niche or audience you want to reach. Start with focused depth.",
              ],
              [
                "03",
                "Inspect the evidence",
                "Bright Data finds YouTube and TikTok content by topic, searches Google for Instagram, LinkedIn, and X profiles, then collects profile details. Review the evidence to decide whether each creator fits your campaign.",
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
            <strong>Using the live website</strong>
            <p>No installation is needed. Connect your own key, choose your search zone, and search. No owner key is provided. After a refresh, reconnect your key and use Resume search to check existing collections. Do not repeat an unresolved paid search until you check your Bright Data usage.</p>
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
              <li>Keep the local server running. If you refresh, reconnect your key and resume saved jobs.</li>
            </ol>
            <p>Local prerequisites: Git and Node.js 22+. No Cloudflare login is required locally. You can explore a fictional sample without a key.</p>
          </div>
        </Modal>
      )}
      {details && (
        <Modal
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
          <p className="detail-bio">
            {details.bio || "No public bio was returned."}
          </p>
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
              <strong>{details.contacts.length}</strong>
              <span>public emails found</span>
            </div>
            <div>
              <strong>{details.matchedTerms.length}</strong>
              <span>matching search terms</span>
            </div>
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
                No public email found in the collected profile or content. A
                profile or website can still be a useful starting point.
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
                    " Enable a Web Unlocker zone in Bright Data to use this feature."}
                </small>
              </>
            )}
            {scanError && (
              <p className="form-error" role="alert">
                {scanError}
              </p>
            )}
          </div>
          <div className="detail-section">
            <div className="detail-section-title">
              <Eye size={17} />
              <h3>Why they surfaced</h3>
              <span>COLLECTED EVIDENCE</span>
            </div>
            {details.matchedTerms.length > 0 && (
              <div className="detail-terms">
                {details.matchedTerms.map((t) => (
                  <span key={t}>
                    <Sparkles size={12} />
                    {t}
                  </span>
                ))}
              </div>
            )}
            {details.evidence.slice(0, 5).map((e, i) => (
              <div className="evidence-row" key={i}>
                <span>
                  {e.kind === "search"
                    ? "Search result"
                    : e.kind === "content"
                      ? "Relevant content"
                      : "Public profile"}
                </span>
                <p>{e.text.slice(0, 1000)}</p>
                {!details.sample && (
                  <a href={safeUrl(e.url)} target="_blank" rel="noreferrer">
                    Open evidence <ArrowUpRight size={12} />
                  </a>
                )}
              </div>
            ))}
            <small>
              Topic signals are literal matches in collected text, not a
              prediction of audience fit or campaign performance.
            </small>
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
          title="Reconnect an existing collection"
          onClose={() => setReconcile(null)}
        >
          <p className="modal-intro">
            Open your Bright Data dashboard and find the{" "}
            {platformNames[reconcile]} collection submitted by this search.
            Paste its snapshot ID to check the same job without submitting it again. If it is a discovery job, profile enrichment is a separate paid collection.
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
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
