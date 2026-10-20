import { platforms, type Creator, type Job, type SearchConfig } from "./types";
import { isSearchDepth } from "./limits";
const prefix = "signal-scout:v1:";
export function load<T>(name: string, fallback: T, session = false): T {
  try {
    return (
      JSON.parse(
        (session ? sessionStorage : localStorage).getItem(prefix + name) ||
          "null",
      ) ?? fallback
    );
  } catch {
    return fallback;
  }
}
export function store(name: string, data: unknown, session = false): boolean {
  try {
    (session ? sessionStorage : localStorage).setItem(
      prefix + name,
      JSON.stringify(data),
    );
    return true;
  } catch {
    return false;
  }
}
export function isCreator(value: unknown): value is Creator {
  if (!value || typeof value !== "object") return false;
  const c = value as Creator;
  return (
    platforms.includes(c.platform) &&
    [
      "id",
      "url",
      "name",
      "handle",
      "bio",
      "avatar",
      "location",
      "collectedAt",
    ].every((k) => typeof c[k as keyof Creator] === "string") &&
    (c.followers === null || typeof c.followers === "number") &&
    typeof c.verified === "boolean" &&
    (c.sample === undefined || typeof c.sample === 'boolean') &&
    (c.enrichmentError === undefined || typeof c.enrichmentError === 'string') &&
    (c.profileStatus === undefined || ['pending', 'complete', 'partial'].includes(c.profileStatus)) &&
    Array.isArray(c.websites) &&
    c.websites.every((w) => typeof w === "string") &&
    Array.isArray(c.matchedTerms) &&
    c.matchedTerms.every((t) => typeof t === "string") &&
    Array.isArray(c.contacts) &&
    c.contacts.every(
      (e) =>
        e &&
        typeof e.email === "string" &&
        typeof e.sourceUrl === "string" &&
        typeof e.source === "string",
    ) &&
    Array.isArray(c.evidence) &&
    c.evidence.every(
      (e) =>
        e &&
        typeof e.url === "string" &&
        typeof e.text === "string" &&
        ["profile", "content", "search", "website"].includes(e.kind) &&
        (e.publishedAt === undefined || (typeof e.publishedAt === 'string' && Number.isFinite(Date.parse(e.publishedAt)))),
    )
  );
}
export function isConfig(value: unknown): value is SearchConfig {
  if (!value || typeof value !== "object") return false;
  const c = value as SearchConfig;
  return (
    typeof c.brief === "string" &&
    Array.isArray(c.keywords) &&
    c.keywords.length > 0 &&
    c.keywords.length <= 3 &&
    c.keywords.every((k) => typeof k === "string" && k.length <= 100) &&
    Array.isArray(c.platforms) &&
    c.platforms.every((p) => platforms.includes(p)) &&
    isSearchDepth(c.depth)
  );
}
export function savedCreators(): Creator[] {
  const value = load<unknown>("shortlist", []);
  return Array.isArray(value) ? value.filter(isCreator) : [];
}
export function savedNotes(): Record<string, string> {
  const value = load<unknown>('notes', {});
  const entries = value && typeof value === 'object' && !Array.isArray(value) ? Object.entries(value) : [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix + 'note:')) {
        const name = key.slice(prefix.length);
        entries.push([name.slice('note:'.length), load<unknown>(name, null)]);
      }
    }
  } catch { /* Existing notes remain readable when storage enumeration is blocked. */ }
  return Object.fromEntries(entries.filter(([id, note]) =>
    id.length <= 2048 && typeof note === 'string' && note.length <= 2000,
  ));
}
export function storeNote(id: string, note: string): boolean {
  // Separate keys prevent another tab from overwriting unrelated creators' notes.
  return id.length <= 2048 && note.length <= 2000 && store(`note:${id}`, note);
}
export function recentSearches(): SearchConfig[] {
  const value = load<unknown>("history", []);
  return Array.isArray(value) ? value.filter(isConfig).slice(0, 15) : [];
}
export function currentResults(): Creator[] {
  const value = load<unknown>("results", [], true);
  return Array.isArray(value) ? value.filter(isCreator) : [];
}
export function pendingJobs(): Job[] {
  const value = load<unknown>("jobs", [], true);
  return Array.isArray(value)
    ? value.filter(
        (j): j is Job =>
          j &&
          platforms.includes(j.platform) &&
          ["queued", "discover", "posts-ready", "posts", "ready", "enrich", "uncertain"].includes(j.stage) &&
          typeof j.snapshot === "string" &&
           (["queued", "posts-ready", "ready", "uncertain"].includes(j.stage) ||
             (j.stage === 'discover' && ['instagram', 'linkedin', 'x'].includes(j.platform) && j.snapshot === '' && Number.isInteger(j.searchOffset) && j.searchOffset > 0 && Array.isArray(j.searchRecords)) ||
             /^s[dn]_[a-z0-9]+$/i.test(j.snapshot)) &&
          isConfig(j.config) &&
           typeof j.createdAt === "number" &&
           (j.searchOffset === undefined || (Number.isInteger(j.searchOffset) && j.searchOffset >= 0 && j.searchOffset <= 48 && j.searchOffset % 6 === 0)) &&
           (j.searchRecords === undefined || (Array.isArray(j.searchRecords) && j.searchRecords.length <= 48 && j.searchRecords.every((r: unknown) => r && typeof r === 'object' && !Array.isArray(r)))) &&
           (j.searchFailures === undefined || (Number.isInteger(j.searchFailures) && j.searchFailures >= 0 && j.searchFailures <= 48)) &&
          (j.postUrls === undefined || (Array.isArray(j.postUrls) && j.postUrls.length <= j.config.depth && j.postUrls.every((u: unknown) => typeof u === 'string'))) &&
          (!["posts-ready", "posts"].includes(j.stage) || (Array.isArray(j.postUrls) && j.postUrls.length > 0)) &&
          (j.candidates === undefined ||
            (Array.isArray(j.candidates) && j.candidates.every(isCreator))),
      )
    : [];
}
