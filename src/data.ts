import type { Contact, Creator, Evidence, Platform, RawRecord } from "./types";

export function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  return "";
}
export function pick(record: RawRecord, ...keys: string[]): string {
  for (const k of keys) {
    const v = text(record[k]);
    if (v) return v;
  }
  return "";
}
export function number(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number")
    return Number.isFinite(value) && value >= 0 ? value : null;
  const match = String(value)
    .replace(/,/g, "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*([kmb])?$/i);
  if (!match) return null;
  return (
    Number(match[1]) *
    ({ k: 1e3, m: 1e6, b: 1e9 }[match[2]?.toLowerCase()] || 1)
  );
}
export function safeUrl(value: unknown): string {
  try {
    const u = new URL(text(value));
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function canonicalProfile(platform: Platform, value: unknown): string {
  try {
    const u = new URL(text(value));
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password)
      return "";
    const host = u.hostname.toLowerCase().replace(/^(www|m)\./, "");
    const parts = decodeURI(u.pathname).split("/").filter(Boolean);
    if (
      platform === "youtube" &&
      host === "youtube.com" &&
      ((parts[0]?.startsWith("@") && parts.length >= 1) ||
        (["channel", "c", "user"].includes(parts[0]) && parts[1]))
    ) {
      return `https://www.youtube.com/${parts[0].startsWith("@") ? parts[0].toLowerCase() : parts[0]}${parts[0].startsWith("@") ? "" : "/" + parts[1]}`;
    }
    if (
      platform === "instagram" &&
      host === "instagram.com" &&
      parts.length === 1 &&
      /^[a-zA-Z0-9_.]{1,30}$/.test(parts[0]) &&
      ![
        "p",
        "reel",
        "reels",
        "explore",
        "accounts",
        "stories",
        "direct",
      ].includes(parts[0].toLowerCase())
    )
      return `https://www.instagram.com/${parts[0].toLowerCase()}/`;
    if (
      platform === "tiktok" &&
      host === "tiktok.com" &&
      parts[0]?.startsWith("@")
    )
      return `https://www.tiktok.com/${parts[0].toLowerCase()}`;
    if (
      platform === "linkedin" &&
      (host === "linkedin.com" || /^[a-z]{2}\.linkedin\.com$/.test(host)) &&
      parts[0] === "in" &&
      parts[1]
    )
      return `https://www.linkedin.com/in/${parts[1].toLowerCase()}/`;
    if (
      platform === "x" &&
      ["x.com", "twitter.com"].includes(host) &&
      /^[a-zA-Z0-9_]{1,15}$/.test(parts[0] || "") &&
      ![
        "home",
        "search",
        "i",
        "intent",
        "explore",
        "hashtag",
        "share",
        "settings",
      ].includes(parts[0].toLowerCase())
    )
      return `https://x.com/${parts[0].toLowerCase()}`;
  } catch {
    /* invalid URL */
  }
  return "";
}
export function extractEmails(value: unknown): string[] {
  const source =
    typeof value === "string" ? value : JSON.stringify(value ?? "");
  const decoded = source
    .replace(/&#64;|&commat;/g, "@")
    .replace(/&#46;/g, ".")
    .replace(/\s*(?:\[at\]|\(at\))\s*/gi, "@")
    .replace(/\s*(?:\[dot\]|\(dot\))\s*/gi, ".");
  return [
    ...new Set(
      (decoded.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || [])
        .map((e) => e.toLowerCase())
        .filter(
          (e) =>
            !/(?:\.(?:png|jpg|jpeg|gif|svg|webp)$)|(?:^(?:no-?reply|test|yourname|username)@)|(?:@(?:example\.(?:com|org)|email\.com)$)/i.test(
              e,
            ),
        ),
    ),
  ];
}
export function canonicalPost(platform: Platform, value: unknown): string {
  const url = safeUrl(value);
  if (!url) return '';
  const u = new URL(url);
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const path = u.pathname;
  if (platform === 'instagram' && host === 'instagram.com' && /^\/(p|reel)\/[A-Za-z0-9_-]+\/?$/.test(path))
    return `https://www.instagram.com${path.replace(/\/$/, '')}/`;
  if (platform === 'linkedin' && (host === 'linkedin.com' || /^[a-z]{2}\.linkedin\.com$/.test(host)) && (/^\/posts\/[A-Za-z0-9_%.-]+\/?$/.test(path) || /^\/feed\/update\/urn:li:activity:\d+\/?$/.test(path)))
    return `https://www.linkedin.com${path.replace(/\/$/, '')}`;
  if (platform === 'x' && ['x.com', 'twitter.com'].includes(host) && /^\/[A-Za-z0-9_]{1,15}\/status\/\d+\/?$/.test(path) && canonicalProfile('x', url))
    return `https://x.com${path.replace(/\/$/, '')}`;
  return '';
}
export function searchPostUrls(platform: Platform, records: RawRecord[], depth: number): string[] {
  const topics = new Map<string, string[]>();
  for (const r of records) {
    const topic = text(r.keyword);
    const queue = topics.get(topic) || [];
    if (Array.isArray(r.organic)) for (const row of r.organic) {
      const url = row && typeof row === 'object' ? canonicalPost(platform, pick(row as RawRecord, 'link', 'url')) : '';
      if (url && !queue.includes(url)) queue.push(url);
    }
    topics.set(topic, queue);
  }
  const selected = new Set<string>();
  // Round-robin the bounded pages so each topic gets a chance without adding paid inputs.
  while (selected.size < depth) {
    let remaining = false;
    for (const queue of topics.values()) {
      while (queue.length && selected.has(queue[0])) queue.shift();
      if (!queue.length) continue;
      remaining = true;
      selected.add(queue.shift()!);
      if (selected.size === depth) break;
    }
    if (!remaining) break;
  }
  return [...selected];
}
export function extractUrls(value: unknown): string[] {
  const input = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return [
    ...new Set(
      (input.match(/https?:\/\/[^\s"'<>\\]+/g) || [])
        .map((u) => safeUrl(u.replace(/[),.;\]}]+$/, "")))
        .filter(Boolean),
    ),
  ];
}
function emptyCreator(platform: Platform, url: string): Creator {
  return {
    id: `${platform}:${url}`,
    platform,
    url,
    name: "",
    handle:
      decodeURI(new URL(url).pathname).split("/").filter(Boolean).at(-1) || "",
    bio: "",
    avatar: "",
    followers: null,
    location: "",
    verified: false,
    websites: [],
    contacts: [],
    evidence: [],
    matchedTerms: [],
    collectedAt: new Date().toISOString(),
    profileStatus: 'pending',
  };
}
function addContacts(
  c: Creator,
  value: unknown,
  sourceUrl: string,
  source: string,
) {
  for (const email of extractEmails(value))
    if (!c.contacts.some((e) => e.email === email))
      c.contacts.push({ email, sourceUrl, source });
}
export function matchingTerms(creator: Creator, keywords: string[]): string[] {
  return keywords.filter(k => [creator.name, creator.bio, ...creator.evidence.map(e => e.text)].some(value => matchesTopic(value, k)));
}
export function matchesTopic(value: string, term: string): boolean {
  const words = term.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  const tokens = new Set(value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []);
  return words.length > 0 && words.every(w => tokens.has(w));
}
export function contentSignals(c: Creator): Evidence[] {
  return c.evidence.filter(e => e.kind === 'content' && c.matchedTerms.some(term => matchesTopic(e.text, term)));
}
export function filterCreators(creators: Creator[], filters: {
  platform: string; query: string; emailOnly: boolean; minimum: number | null;
  maximum: number | null; topic: string; matchingPostOnly: boolean;
}): Creator[] {
  const { platform, query, emailOnly, minimum, maximum, topic, matchingPostOnly } = filters;
  if ([minimum, maximum].some(n => n !== null && (!Number.isSafeInteger(n) || n < 0)) ||
    (minimum !== null && maximum !== null && minimum > maximum)) return [];
  return creators.filter(c =>
    (platform === 'all' || c.platform === platform) &&
    (!emailOnly || c.contacts.length > 0) &&
    (minimum === null || (c.followers !== null && c.followers >= minimum)) &&
    (maximum === null || (c.followers !== null && c.followers <= maximum)) &&
    `${c.name} ${c.handle} ${c.bio}`.toLowerCase().includes(query.toLowerCase()) &&
    (!topic || c.matchedTerms.some(term => term.toLowerCase() === topic.toLowerCase())) &&
    (!matchingPostOnly || contentSignals(c).some(e => !topic || matchesTopic(e.text, topic))),
  );
}
function evidenceDate(...values: unknown[]): string | undefined {
  for (const value of values) {
    const raw = text(value).trim();
    if (!raw) continue;
    // Native schemas return dates; historical payloads also use Unix seconds or milliseconds.
    const numeric = /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : null;
    const time = numeric !== null
      ? numeric * (numeric < 1e12 ? 1000 : 1)
      : Date.parse(raw);
    if (Number.isFinite(time) && Number.isFinite(new Date(time).getTime()))
      return new Date(time).toISOString();
  }
}
export function relevanceScore(c: Creator): number {
  const content = contentSignals(c);
  const profile = c.evidence.some(e => e.kind === 'profile' && c.matchedTerms.some(t => matchesTopic(e.text, t)));
  return Math.min(content.length, 20) * 100 + (profile ? 20 : 0) + c.matchedTerms.length;
}
export function compareRelevance(a: Creator, b: Creator): number {
  const latest = (c: Creator) => Math.max(0, ...contentSignals(c).map(e => {
    const date = Date.parse(e.publishedAt || '');
    return Number.isFinite(date) && date <= Date.now() ? date : 0;
  }));
  return relevanceScore(b) - relevanceScore(a) || latest(b) - latest(a);
}
export function relevanceLabel(c: Creator): string {
  const count = contentSignals(c).length;
  if (count) return `${count} matching post${count === 1 ? '' : 's'}`;
  if (c.evidence.some(e => e.kind === 'profile' && c.matchedTerms.some(t => matchesTopic(e.text, t)))) return 'Profile topic match';
  return c.matchedTerms.length ? 'Search evidence only' : 'Review topic fit';
}
function hasRepostContent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) && value !== 0;
  if (Array.isArray(value)) return value.some(hasRepostContent);
  if (value && typeof value === 'object') return Object.values(value).some(hasRepostContent);
  return false;
}
export function creatorsFromPosts(platform: Platform, records: RawRecord[], urls: string[], keywords: string[]): Creator[] {
  const mapped: RawRecord[] = [];
  for (const r of records) {
    // LinkedIn original posts also include a repost object with null/empty schema
    // fields. Only populated reshare metadata (or an explicit flag) establishes a repost.
    if (r.error || r.is_repost === true || hasRepostContent(r.repost)) continue;
    const post = canonicalPost(platform, r.url);
    const input = r.input && typeof r.input === 'object' ? r.input as RawRecord : {};
    const requested = canonicalPost(platform, r.input_url || input.url);
    // Providers may resolve a feed/reel URL to its public permalink. Keep the
    // returned source, but correlate it to a requested URL before attribution.
    if (!post || (!urls.includes(post) && !urls.includes(requested))) continue;
    const handle = pick(r, 'user_posted').replace(/^@/, '');
    const author = canonicalProfile(platform, pick(r, 'profile_url', 'user_profile_url', 'use_url', 'author_url') || ((platform === 'x' || platform === 'instagram') && /^[a-zA-Z0-9_.]+$/.test(handle) ? `https://${platform === 'x' ? 'x.com' : 'www.instagram.com'}/${handle}` : ''));
    const description = pick(r, 'post_text', 'description', 'caption');
    if (!author || !keywords.some(k => matchesTopic(description, k))) continue;
    mapped.push({...r, profile_url: author, name: pick(r, 'user_name', 'name', 'user_posted'), description, url: post});
  }
  return discoverCandidates(platform, mapped, keywords, Math.max(urls.length, 1));
}
export function discoverCandidates(
  platform: Platform,
  records: RawRecord[],
  keywords: string[],
  depth: number,
): Creator[] {
  const map = new Map<string, Creator>();
  function add(urlValue: unknown, record: RawRecord, evidence: Evidence) {
    const url = canonicalProfile(platform, urlValue);
    if (!url) return;
    const c = map.get(url) || emptyCreator(platform, url);
    c.name ||=
      pick(
        record,
        "handle_name",
        "youtuber",
        "profile_username",
        "name",
        "title",
      ) || c.handle;
    c.bio ||= pick(record, "profile_biography", "description", "snippet");
    c.followers ??= number(
      record.subscribers ?? record.profile_followers ?? record.followers,
    );
    c.avatar ||= safeUrl(
      pick(
        record,
        "avatar_img_channel",
        "profile_avatar",
        "profile_image_link",
      ),
    );
    if (evidence.url && !c.evidence.some((e) => e.url === evidence.url && e.kind === evidence.kind))
      c.evidence.push(evidence);
    // Search snippets can mention unrelated contacts; only attribute contacts from native creator content.
    if (evidence.kind === "content")
      addContacts(c, record.description, evidence.url, "Content description");
    c.matchedTerms = matchingTerms(c, keywords);
    map.set(url, c);
  }
  for (const record of records) {
    if (record.error) continue;
    if (Array.isArray(record.organic)) {
      for (const row of record.organic) {
        if (!row || typeof row !== "object") continue;
        const r = row as RawRecord;
        const url = pick(r, "link", "url");
        if (canonicalPost(platform, url)) continue;
        add(url, r, {
          url: safeUrl(url),
          text: `${pick(r, "title")} ${pick(r, "description", "snippet")}`.trim(),
          kind: "search",
        });
      }
    } else {
      const url =
        platform === "youtube"
          ? pick(record, "channel_url", "channel_url_decoded")
          : pick(record, "profile_url", "author_url", "url");
      const publishedAt = evidenceDate(record.date_posted, record.create_time);
      add(url, record, {
        url: safeUrl(record.url),
        text: `${pick(record, "title")} ${pick(record, "description", "caption", "post_text")}`.trim(),
        kind: "content",
        ...(publishedAt ? { publishedAt } : {}),
      });
      const bio = pick(record, "profile_biography");
      if (bio) {
        const profile = canonicalProfile(platform, url);
        add(url, record, { url: profile, text: bio, kind: "profile" });
        const creator = map.get(profile);
        if (creator) addContacts(creator, bio, profile, "Public profile");
      }
    }
  }
  return [...map.values()].sort(compareRelevance).slice(0, depth);
}
export function enrichCreators(
  platform: Platform,
  records: RawRecord[],
  candidates: Creator[],
  keywords: string[],
): Creator[] {
  const map = new Map(candidates.map((c) => [c.url, structuredClone(c)]));
  const matched = new Set<string>();
  for (const r of records) {
    const input =
      r.input && typeof r.input === "object" ? (r.input as RawRecord) : {};
    const identities = [r.input_url, input.url, r.url, r.profile_url].map((u) =>
      canonicalProfile(platform, u),
    );
    const url = identities.find((u) => map.has(u));
    if (!url) continue;
    const c = map.get(url)!;
    if (r.error) {
      c.profileStatus = 'partial';
      c.enrichmentError =
        "Profile could not be collected. Discovery evidence is available.";
      continue;
    }
    matched.add(url);
    c.profileStatus = 'complete';
    delete c.enrichmentError;
    c.name =
      pick(r, "name", "Name", "full_name", "nickname", "profile_name") ||
      c.name;
    const profileBio = pick(
      r,
      "Description",
      "description",
      "biography",
      "about",
      "signature",
    );
    c.bio = profileBio || c.bio;
    c.followers = number(r.subscribers ?? r.followers) ?? c.followers;
    c.avatar =
      safeUrl(
        pick(
          r,
          "profile_image_link",
          "profile_pic_url",
          "avatar",
          "profile_pic_url_hd",
          "profile_image",
        ),
      ) || c.avatar;
    c.location = pick(r, "location", "city", "country_code", "country");
    c.verified = r.is_verified === true || r.verified === true;
    const links = [
      r.Links,
      r.links,
      r.external_url,
      r.external_urls,
      r.external_link,
      r.bio_link,
      r.bio_links,
      r.websites,
      r.website,
    ];
    const explicitLinks = links.flatMap((value) => {
      const list = Array.isArray(value) ? value : [value];
      return list.flatMap((item) => {
        const raw =
          typeof item === "string"
            ? item
            : item && typeof item === "object"
              ? pick(item as RawRecord, "url", "link", "href")
              : "";
        const url =
          raw && !raw.includes(" ") && !raw.includes("@")
            ? safeUrl(/^https?:\/\//.test(raw) ? raw : `https://${raw}`)
            : "";
        return url && new URL(url).hostname.includes(".") ? [url] : [];
      });
    });
    c.websites = [
      ...new Set([...explicitLinks, ...extractUrls(profileBio)]),
    ].filter(
      (u) =>
        !["youtube", "instagram", "tiktok", "linkedin", "x"].some((p) =>
          canonicalProfile(p as Platform, u),
        ),
    );
    addContacts(
      c,
      [r.email, r.email_address, profileBio],
      c.url,
      "Public profile",
    );
    const headline = pick(r, "position", "headline");
    if (headline && !c.bio.includes(headline)) c.bio = `${headline}. ${c.bio}`;
    if (profileBio) {
      // Native discovery may already contain this profile's biography. Keep
      // one current version per profile source while retaining post/search evidence.
      c.evidence = c.evidence.filter(e => e.kind !== "profile" || canonicalProfile(platform, e.url) !== c.url);
      c.evidence.unshift({ url: c.url, text: profileBio, kind: "profile" });
    }
    c.matchedTerms = matchingTerms(c, keywords);
    c.collectedAt = new Date().toISOString();
    map.set(url, c);
  }
  return [...map.values()].map((c) =>
    matched.has(c.url)
      ? c
      : {
          ...c,
          profileStatus: 'partial',
          enrichmentError:
            c.enrichmentError ||
            "No matching profile was returned. Discovery evidence is available.",
        },
  );
}
export function mergeCreators(
  current: Creator[],
  incoming: Creator[],
): Creator[] {
  const map = new Map(current.map((c) => [c.id, c]));
  const sameEvidenceSource = (platform: Platform, a: Evidence, b: Evidence) =>
    a.kind === b.kind && (a.url === b.url || (a.kind === 'profile' && !!canonicalProfile(platform, a.url) && canonicalProfile(platform, a.url) === canonicalProfile(platform, b.url)));
  incoming.forEach((c) => {
    const old = map.get(c.id);
    map.set(c.id, old ? { ...c, evidence: [...c.evidence, ...old.evidence.filter(e => !c.evidence.some(n => sameEvidenceSource(c.platform, e, n)))], contacts: [...c.contacts, ...old.contacts.filter(contact => !c.contacts.some(n => n.email === contact.email))] } : c);
  });
  return [...map.values()];
}
export function formatCount(n: number | null): string {
  if (n === null) return "Not available";
  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}
export function toCsv(creators: Creator[], notes: Record<string, string> = {}): string {
  const columns = [
    "name",
    "platform",
    "profile_url",
    "followers",
    "bio",
    "location",
    "email",
    "email_source",
    "website",
    "matching_terms",
    "relevance",
    "matching_posts",
    "evidence_url",
    "collected_at",
    "sample",
    "shortlist_note",
    "collection_status",
  ];
  const escape = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s]*[=+\-@]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const rows = creators.map((c) => [
    c.name,
    c.platform,
    c.url,
    c.followers,
    c.bio,
    c.location,
    c.contacts.map((e) => e.email).join("; "),
    c.contacts.map((e) => e.sourceUrl).join("; "),
    c.websites.join("; "),
    c.matchedTerms.join("; "),
    c.sample ? 'Illustrative topic match' : relevanceLabel(c),
    c.sample ? '' : contentSignals(c).length,
    c.evidence.map((e) => e.url).join("; "),
    c.collectedAt,
    c.sample ? "yes" : "no",
    Object.hasOwn(notes, c.id) ? notes[c.id] : '',
    c.sample ? "sample" : c.profileStatus || "unknown",
  ]);
  return (
    "\uFEFF" +
    [columns, ...rows].map((row) => row.map(escape).join(",")).join("\r\n")
  );
}
export function websiteContacts(content: string, sourceUrl: string): Contact[] {
  // Strip scripts/styles to avoid collecting tracking/configuration addresses.
  const clean = content
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "");
  return extractEmails(clean).map((email) => ({
    email,
    sourceUrl,
    source: "Public website",
  }));
}
