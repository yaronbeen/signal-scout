import { canonicalProfile, safeUrl, websiteContacts } from "../src/data";
import { platforms, type Platform } from "../src/types";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  API_LIMITER?: {
    limit(options: { key: string }): Promise<{ success: boolean }>;
  };
}
type Fetcher = typeof fetch;
const base = "https://api.brightdata.com";
export const datasets = {
  youtube: {
    discovery: "gd_lk56epmy2i5g7lzu0k",
    profile: "gd_lk538t2k2p1k3oos71",
  },
  instagram: { profile: "gd_l1vikfch901nx3by4" },
  tiktok: {
    discovery: "gd_lu702nij2f790tmv9h",
    profile: "gd_l1villgoiiidt09ci",
  },
  linkedin: { profile: "gd_l1viktl72bvl7bjuj0" },
  x: { profile: "gd_lwxmeb2u1cniijd7t4" },
  google: "gd_mfz5x93lmsjjjylob",
};
const security = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};
class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      ...security,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
async function limitedText(
  response: Response,
  max = 8_000_000,
): Promise<string> {
  if (Number(response.headers.get("content-length")) > max)
    throw new ApiError("The response is too large. Try a smaller search.", 502);
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let output = "";
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > max) {
      await reader.cancel();
      throw new ApiError(
        "The response is too large. Try a smaller search.",
        502,
      );
    }
    output += decoder.decode(value, { stream: true });
  }
  return output + decoder.decode();
}
function upstreamError(status: number, raw: string): ApiError {
  if (status === 401)
    return new ApiError(
      "Your Bright Data key is expired or invalid. Connect with a fresh key.",
      401,
    );
  if (status === 402)
    return new ApiError(
      "Your Bright Data account needs credits to continue. Check your account balance.",
      402,
    );
  if (status === 403)
    return new ApiError(
      "This key does not have permission for this Bright Data product. Check its permissions in your dashboard.",
      403,
    );
  if (status === 429)
    return new ApiError(
      "Bright Data is limiting requests. Wait at least one minute before resuming.",
      429,
    );
  if (status === 404 || /dataset.*(?:not|exist)|collector not found/i.test(raw))
    return new ApiError(
      "This Bright Data scraper is unavailable. Other platforms can still complete.",
      502,
    );
  if (status === 400)
    return new ApiError(
      "Bright Data rejected this collection. Check scraper access in your account; try a smaller or different search.",
      400,
    );
  return new ApiError(
    "Bright Data could not complete this request. Your existing results are still available.",
    502,
  );
}
async function upstream(
  path: string,
  token: string,
  fetcher: Fetcher,
  body?: unknown,
  raw = false,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(`${base}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(55_000),
    });
  } catch {
    throw new ApiError(
      "The connection to Bright Data timed out. Resume existing jobs before starting another search.",
      504,
    );
  }
  const source = await limitedText(response);
  if (!response.ok) throw upstreamError(response.status, source);
  // /request format=json wraps the origin status and body, including failures behind HTTP 200.
  let envelope: { status_code?: number; body?: unknown } | undefined;
  if (path === "/request") {
    try {
      envelope = JSON.parse(source);
    } catch {
      /* raw body */
    }
  }
  if (envelope && typeof envelope.status_code === "number") {
    if (envelope.status_code >= 400)
      throw new ApiError(
        `Bright Data returned search origin HTTP ${envelope.status_code}. Check the selected zone’s configuration and usage in your Bright Data dashboard. The search may have used credits and will not be repeated automatically.`,
        envelope.status_code,
      );
    if (raw)
      return typeof envelope.body === "string"
        ? envelope.body
        : JSON.stringify(envelope.body ?? "");
    if (typeof envelope.body !== "string") return envelope.body;
    try {
      return JSON.parse(envelope.body);
    } catch {
      throw new ApiError(
        "Bright Data returned an unreadable search response. Try resuming in a moment.",
        502,
      );
    }
  }
  if (raw) return source;
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    try {
      return source
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
    } catch {
      throw new ApiError(
        "Bright Data returned an unreadable response. Try resuming in a moment.",
        502,
      );
    }
  }
}
function platform(value: unknown): Platform {
  if (!platforms.includes(value as Platform))
    throw new ApiError("Choose a supported platform.");
  return value as Platform;
}
function keywords(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length < 1 ||
    value.length > 3 ||
    value.some((k) => typeof k !== "string" || !k.trim() || k.length > 100)
  )
    throw new ApiError(
      "Use one to three search terms, each under 100 characters.",
    );
  return [...new Set(value.map((k) => k.trim()))];
}
function depth(value: unknown): number {
  if (![5, 10, 20].includes(value as number))
    throw new ApiError("Choose a search depth of 5, 10, or 20.");
  return value as number;
}
export function collectionPlan(body: Record<string, unknown>) {
  const p = platform(body.platform);
  const d = depth(body.depth);
  if (body.stage === "enrich") {
    if (
      !Array.isArray(body.urls) ||
      body.urls.length < 1 ||
      body.urls.length > d
    )
      throw new ApiError("Provide a bounded list of creator profiles.");
    const urls = body.urls.map((u) => canonicalProfile(p, u));
    if (urls.some((u) => !u))
      throw new ApiError("A creator profile URL is invalid for this platform.");
    const input = [...new Set(urls)].map((url) => ({
      url: p === "youtube" ? `${url}/about` : url,
      ...(p === "x" ? { max_number_of_posts: 3 } : {}),
    }));
    return { dataset: datasets[p].profile, input, limit: 1, discoverBy: "" };
  }
  if (body.stage !== "discover")
    throw new ApiError("Unknown collection stage.");
  const terms = keywords(body.keywords);
  if (p === "youtube")
    return {
      dataset: datasets.youtube.discovery,
      discoverBy: "keyword",
      limit: d,
      input: terms.map((keyword) => ({ keyword, num_of_posts: String(d) })),
    };
  if (p === "tiktok")
    return {
      dataset: datasets.tiktok.discovery,
      discoverBy: "keyword",
      limit: d,
      input: terms.map((search_keyword) => ({
        search_keyword,
        num_of_posts: d,
      })),
    };
  const site = {
    instagram: "instagram.com",
    linkedin: "linkedin.com/in",
    x: "twitter.com",
  }[p];
  return {
    dataset: datasets.google,
    discoverBy: "",
    limit: 1,
    input: terms.map((term) => ({
      url: `https://www.google.com/search?q=${encodeURIComponent(`site:${site} ${term} creator`)}&num=10`,
      start_page: 1,
      end_page: 1,
      language: "en",
    })),
  };
}
export function publicWebsite(value: unknown): string {
  const url = safeUrl(value);
  if (!url) throw new ApiError("Provide a public website URL.");
  const u = new URL(url);
  const h = u.hostname.toLowerCase();
  if (
    u.protocol !== "https:" ||
    (u.port && u.port !== "443") ||
    !h.includes(".") ||
    /[\[\]:]/.test(h) ||
    /^\d+(?:\.\d+){3}$/.test(h) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(h) ||
    h.endsWith(".localhost") ||
    h === "metadata.google.internal"
  )
    throw new ApiError("Only public HTTPS websites are supported.");
  return url;
}
async function bodyJson(request: Request): Promise<Record<string, unknown>> {
  const source = await limitedText(request as unknown as Response, 16_000);
  try {
    const b = JSON.parse(source);
    if (!b || Array.isArray(b) || typeof b !== "object") throw new Error();
    return b;
  } catch {
    throw new ApiError("Send a valid JSON object.");
  }
}
export async function handleRequest(
  request: Request,
  env: Env,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) {
    const asset = await env.ASSETS.fetch(request);
    const response = new Response(asset.body, asset);
    Object.entries(security).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin)
      throw new ApiError("Cross-origin requests are not supported.", 403);
    if (request.headers.get("sec-fetch-site") === "cross-site")
      throw new ApiError("Cross-site requests are not supported.", 403);
    if (url.pathname === "/api/health" && request.method === "GET")
      return json({ ok: true, version: "1.0.0" });
    const routes: Record<string, string> = {
      "/api/connect": "POST",
      "/api/discover": "POST",
      "/api/trigger": "POST",
      "/api/status": "GET",
      "/api/result": "GET",
      "/api/contact": "POST",
    };
    if (!routes[url.pathname]) return json({ error: "Not found." }, 404);
    if (request.method !== routes[url.pathname])
      return json({ error: "Method not allowed." }, 405);
    const auth = request.headers.get("Authorization") || "";
    if (!/^Bearer [^\s]{8,512}$/.test(auth))
      throw new ApiError("Provide your Bright Data API key.", 401);
    const token = auth.slice(7);
    if (env.API_LIMITER) {
      const { success } = await env.API_LIMITER.limit({
        key: request.headers.get("CF-Connecting-IP") || "local",
      });
      if (!success)
        throw new ApiError(
          "Too many requests. Wait one minute and resume.",
          429,
        );
    }
    if (url.pathname === "/api/connect") {
      // Non-billable account metadata check. A restricted key can still use scrapers.
      let zones: { name: string; type: string; status: string }[] = [];
      try {
        zones = (await upstream(
          "/zone/get_all_zones",
          token,
          fetcher,
        )) as typeof zones;
      } catch (e) {
        if (!(e instanceof ApiError) || e.status !== 403) throw e;
      }
      return json({
        connected: true,
        searchAvailable:
          Array.isArray(zones) &&
          zones.some((z) => z.type === "serp" && z.status === "active"),
        searchZones: Array.isArray(zones)
          ? zones.filter(z => z.type === 'serp' && z.status === 'active').map(z => z.name)
          : [],
        unlockerZone: Array.isArray(zones)
          ? zones.find((z) => z.type === "unblocker" && z.status === "active")
              ?.name || ""
          : "",
      });
    }
    if (url.pathname === "/api/discover") {
      const b = await bodyJson(request);
      const p = platform(b.platform);
      depth(b.depth);
      const terms = keywords(b.keywords);
      if (!["instagram", "linkedin", "x"].includes(p))
        throw new ApiError("Use native content discovery for this platform.");
      const zones = (await upstream("/zone/get_all_zones", token, fetcher)) as {
        name: string;
        type: string;
        status: string;
      }[];
      const available = Array.isArray(zones)
        ? zones.filter(z => z.type === 'serp' && z.status === 'active')
        : [];
      if (b.searchZone !== undefined && (typeof b.searchZone !== 'string' || b.searchZone.length > 128))
        throw new ApiError('Choose an active Bright Data search zone.');
      if (!b.searchZone && available.length > 1)
        throw new ApiError('Multiple active search zones found. Select your search zone in the app before starting Instagram, LinkedIn, or X discovery.', 409);
      const zone = b.searchZone
        ? available.find(z => z.name === b.searchZone)?.name
        : available[0]?.name;
      if (!zone)
        throw new ApiError(
          "Choose an active SERP API zone in your Bright Data dashboard to discover Instagram, LinkedIn, and X creators. Reconnect to refresh available zones. YouTube and TikTok can still run.",
          409,
        );
      const site = {
        instagram: "instagram.com",
        linkedin: "linkedin.com/in",
        x: "twitter.com",
      }[p as "instagram" | "linkedin" | "x"];
      const settled = await Promise.allSettled(
        terms.map(async (term) => {
          const query = `site:${site} ${term} creator`;
          const result = await upstream("/request", token, fetcher, {
            zone,
            url: `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&brd_json=1&hl=en&gl=us`,
            format: "json",
          });
          if (
            !result ||
            typeof result !== "object" ||
            !Array.isArray((result as { organic?: unknown }).organic)
          )
            throw new ApiError(
              "The search API returned no readable organic results. Check your SERP API configuration.",
              502,
            );
          return { ...(result as object), keyword: term };
        }),
      );
      const records = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failures = settled.flatMap((result, i) =>
        result.status === "rejected"
          ? [
              {
                keyword: terms[i],
                error:
                  result.reason instanceof ApiError
                    ? result.reason.message
                    : "Search term could not be collected.",
              },
            ]
          : [],
      );
      if (!records.length) {
        const failure = settled.find(r => r.status === 'rejected');
        const reason = failure?.status === 'rejected' ? failure.reason : undefined;
        throw new ApiError(`Search zone “${zone}”: ${reason instanceof ApiError ? reason.message : 'No search results were returned.'}`, reason instanceof ApiError ? reason.status : 502);
      }
      return json({ records, failures });
    }
    if (url.pathname === "/api/trigger") {
      const plan = collectionPlan(await bodyJson(request));
      const query = new URLSearchParams({
        dataset_id: plan.dataset,
        notify: "false",
        include_errors: "true",
      });
      if (plan.discoverBy) {
        query.set("type", "discover_new");
        query.set("discover_by", plan.discoverBy);
      }
      const result = (await upstream(
        `/datasets/v3/trigger?${query}`,
        token,
        fetcher,
        { input: plan.input, limit_per_input: plan.limit },
      )) as { snapshot_id?: string };
      if (
        !result?.snapshot_id ||
        !/^s[dn]_[a-z0-9]+$/i.test(result.snapshot_id)
      )
        throw new ApiError(
          "Bright Data did not return a job reference. Check your dashboard before retrying.",
          502,
        );
      return json({ snapshot: result.snapshot_id });
    }
    if (url.pathname === "/api/status" || url.pathname === "/api/result") {
      const id = url.searchParams.get("id") || "";
      if (!/^s[dn]_[a-z0-9]{5,80}$/i.test(id))
        throw new ApiError("Invalid job reference.");
      if (url.pathname === "/api/status") {
        const data = (await upstream(
          `/datasets/v3/progress/${id}`,
          token,
          fetcher,
        )) as { status?: string };
        const status = data?.status;
        if (
          ![
            "starting",
            "running",
            "ready",
            "failed",
            "canceled",
            "cancelled",
          ].includes(status || "")
        )
          throw new ApiError(
            "The job status is not available yet. Resume in a moment.",
            502,
          );
        return json({ status });
      }
      const data = await upstream(
        `/datasets/v3/snapshot/${id}?format=json`,
        token,
        fetcher,
      );
      if (!Array.isArray(data)) return json({ pending: true }, 202);
      return json({ records: data });
    }
    if (url.pathname === "/api/contact") {
      const b = await bodyJson(request);
      const website = publicWebsite(b.url);
      if (typeof b.zone !== "string" || !/^[a-zA-Z0-9_]{1,100}$/.test(b.zone))
        throw new ApiError(
          "An active Bright Data Web Unlocker zone is needed for website scans.",
        );
      const content = (await upstream(
        "/request",
        token,
        fetcher,
        { zone: b.zone, url: website, format: "raw" },
        true,
      )) as string;
      return json({
        contacts: websiteContacts(content, website),
        sourceUrl: website,
      });
    }
    return json({ error: "Not found." }, 404);
  } catch (e) {
    if (e instanceof ApiError) return json({ error: e.message }, e.status);
    return json(
      {
        error:
          "The request could not be completed. Your existing results are safe.",
      },
      500,
    );
  }
}
export default {
  fetch: (request: Request, env: Env) => handleRequest(request, env),
};
