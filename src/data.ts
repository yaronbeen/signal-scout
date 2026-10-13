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
  const haystack =
    `${creator.name} ${creator.bio} ${creator.evidence.map((e) => e.text).join(" ")}`.toLowerCase();
  const tokens = new Set(haystack.match(/[\p{L}\p{N}]+/gu) || []);
  return keywords.filter((k) =>
    k
      .toLowerCase()
      .split(/\s+/)
      .some((w) =>
        w.length > 2
          ? haystack.includes(w)
          : ["ai", "vr", "ar", "b2b", "ux", "ui"].includes(w) && tokens.has(w),
      ),
  );
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
    if (evidence.url && !c.evidence.some((e) => e.url === evidence.url))
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
      add(url, record, {
        url: safeUrl(record.url),
        text: `${pick(record, "title")} ${pick(record, "description", "profile_biography")}`.trim(),
        kind: "content",
      });
    }
  }
  return [...map.values()].slice(0, depth);
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
      c.enrichmentError =
        "Profile could not be collected. Discovery evidence is available.";
      continue;
    }
    matched.add(url);
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
    if (profileBio)
      c.evidence.unshift({ url: c.url, text: profileBio, kind: "profile" });
    c.matchedTerms = matchingTerms(c, keywords);
    c.collectedAt = new Date().toISOString();
    map.set(url, c);
  }
  return [...map.values()].map((c) =>
    matched.has(c.url) || c.enrichmentError
      ? c
      : {
          ...c,
          enrichmentError:
            "No matching profile was returned. Discovery evidence is available.",
        },
  );
}
export function mergeCreators(
  current: Creator[],
  incoming: Creator[],
): Creator[] {
  const map = new Map(current.map((c) => [c.id, c]));
  incoming.forEach((c) => {
    const old = map.get(c.id);
    map.set(c.id, old ? { ...c, contacts: [...c.contacts, ...old.contacts.filter(contact => !c.contacts.some(n => n.email === contact.email))] } : c);
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
export function toCsv(creators: Creator[]): string {
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
    "evidence_url",
    "collected_at",
    "sample",
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
    c.evidence.map((e) => e.url).join("; "),
    c.collectedAt,
    c.sample ? "yes" : "no",
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
