import { platforms, type Creator, type Job, type SearchConfig } from "./types";
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
        ["profile", "content", "search", "website"].includes(e.kind),
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
    [5, 10, 20].includes(c.depth)
  );
}
export function savedCreators(): Creator[] {
  const value = load<unknown>("shortlist", []);
  return Array.isArray(value) ? value.filter(isCreator) : [];
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
          ["queued", "discover", "ready", "enrich", "uncertain"].includes(j.stage) &&
          typeof j.snapshot === "string" &&
          (["queued", "ready", "uncertain"].includes(j.stage) ||
            /^s[dn]_[a-z0-9]+$/i.test(j.snapshot)) &&
          isConfig(j.config) &&
          typeof j.createdAt === "number" &&
          Date.now() - j.createdAt < 24 * 60 * 60_000 &&
          (j.candidates === undefined ||
            (Array.isArray(j.candidates) && j.candidates.every(isCreator))),
      )
    : [];
}
