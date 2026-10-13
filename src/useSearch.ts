import { useRef, useState } from "react";
import { api, collect, RequestError } from "./api";
import { discoverCandidates, enrichCreators, mergeCreators } from "./data";
import { currentResults, pendingJobs, store } from "./storage";
import {
  platforms,
  type Creator,
  type Job,
  type Platform,
  type Progress,
  type RawRecord,
  type SearchConfig,
} from "./types";

export function initialProgress(): Progress {
  return Object.fromEntries(
    platforms.map((p) => [
      p,
      { phase: "idle", message: "Ready to discover", count: 0 },
    ]),
  ) as Progress;
}
export function useSearch() {
  const [creators, setCreators] = useState<Creator[]>(currentResults);
  const [progress, setProgress] = useState<Progress>(initialProgress);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<Job[]>(pendingJobs);
  const [storageWarning, setStorageWarning] = useState("");
  const controller = useRef<AbortController | null>(null);
  const jobRef = useRef<Job[]>(jobs);
  const resultRef = useRef<Creator[]>(creators);
  const searchQueue = useRef<Promise<void>>(Promise.resolve());
  function persist(name: string, value: unknown) {
    const saved = store(name, value, true);
    if (!saved)
      setStorageWarning(
        "Browser storage is unavailable. Export results and keep this tab open to preserve job references.",
      );
    return saved;
  }
  function results(next: Creator[]) {
    resultRef.current = next;
    setCreators(next);
    persist("results", next);
  }
  function append(next: Creator[]) {
    results(mergeCreators(resultRef.current, next));
  }
  function saveJobs(next: Job[]) {
    jobRef.current = next;
    setJobs(next);
    return persist("jobs", next);
  }
  function updateJob(job: Job) {
    return saveJobs([
      ...jobRef.current.filter((j) => j.platform !== job.platform),
      job,
    ]);
  }
  function patch(p: Platform, update: Partial<Progress[Platform]>) {
    setProgress((current) => ({
      ...current,
      [p]: { ...current[p], ...update },
    }));
  }
  function paused(signal: AbortSignal) {
    if (signal.aborted) throw new DOMException("Paused", "AbortError");
  }
  async function trigger(
    job: Job,
    stage: "discover" | "enrich",
    key: string,
  ): Promise<Job> {
    // Save uncertain state BEFORE a paid POST. A lost response must never auto-replay it.
    const uncertain: Job = {
      ...job,
      stage: "uncertain",
      snapshot: "",
      uncertainStage: stage,
      message:
        "Submission outcome unknown. Check the Bright Data dashboard before starting this stage again.",
    };
    if (!updateJob(uncertain)) throw new Error('Cannot safely save the job reference in this browser. No paid collection was submitted. Free browser storage and try again.');
    try {
      const response = await api<{ snapshot: string }>("trigger", key, {
        platform: job.platform,
        stage,
        keywords: job.config.keywords,
        depth: job.config.depth,
        ...(stage === "enrich"
          ? { urls: job.candidates!.map((c) => c.url) }
          : {}),
      });
      if (typeof response.snapshot !== 'string' || !/^s[dn]_[a-z0-9]{5,80}$/i.test(response.snapshot)) throw new RequestError('Collection response had no valid snapshot ID. Check the Bright Data dashboard before retrying.', 0);
      const next: Job = {
        ...job,
        stage,
        snapshot: response.snapshot,
        createdAt: Date.now(),
      };
      updateJob(next);
      return next;
    } catch (e) {
      // Only explicit 4xx rejections establish that no collection was accepted.
      if (e instanceof RequestError && e.status >= 400 && e.status < 500) {
        if (stage === "enrich")
          updateJob({ ...job, stage: "ready", snapshot: "" });
        else
          saveJobs(jobRef.current.filter((j) => j.platform !== job.platform));
      }
      throw e;
    }
  }
  async function pipeline(
    config: SearchConfig,
    p: Platform,
    key: string,
    signal: AbortSignal,
    existing?: Job,
  ) {
    let candidates = existing?.candidates || [];
    const startedAt = Date.now();
    let termWarning = "";
    let job: Job = existing || {
      platform: p,
      stage: "discover",
      snapshot: "",
      createdAt: Date.now(),
      config,
    };
    try {
      paused(signal);
      if (job.stage === "uncertain") {
        patch(p, {
          phase: "error",
          message:
            job.message ||
            "Check the Bright Data dashboard before retrying this submission.",
          count: candidates.length,
        });
        return;
      }
      if (job.stage === "queued") job = { ...job, stage: "discover" };
      if (job.stage === "discover") {
        patch(p, {
          phase: "discovering",
          startedAt,
          message: "Finding relevant content…",
          count: 0,
        });
        let records: RawRecord[];
        if (!job.snapshot && ["instagram", "linkedin", "x"].includes(p)) {
          const previous = searchQueue.current;
          let release!: () => void;
          searchQueue.current = new Promise<void>(resolve => { release = resolve; });
          let response: { records: RawRecord[]; failures?: { keyword: string; error: string }[] };
          try {
            await previous; paused(signal);
            const uncertain: Job = { ...job, stage: 'uncertain', uncertainStage: 'search', message: 'The search response is unresolved. Search requests may already have been billed. Review your Bright Data usage before explicitly starting this search again.' };
            if (!updateJob(uncertain)) throw new Error('Cannot safely save search state. No paid search was submitted. Free browser storage and try again.');
            response = await api<{
            records: RawRecord[];
            failures?: { keyword: string; error: string }[];
          }>("discover", key, {
            platform: p,
            keywords: config.keywords,
            depth: config.depth,
          });
            if (!Array.isArray(response.records)) throw new RequestError('Unreadable search results. Review Bright Data usage before repeating this paid search.', 0);
          } catch (e) {
            // HTTP status alone cannot prove whether the provider billed a dispatched search.
            // Preserve uncertainty for every failed search response; retries are explicit.
            throw e;
          } finally { release(); }
          records = response.records;
          termWarning = response.failures?.length
            ? ` · ${response.failures.length} search term(s) failed; successful terms preserved`
            : "";
        } else {
          if (!job.snapshot) job = await trigger(job, "discover", key);
          patch(p, { snapshot: job.snapshot });
          paused(signal);
          records = await collect(job.snapshot, key, signal, (status) =>
            patch(p, {
              message:
                status === "ready"
                  ? "Reading discovery evidence…"
                  : "Bright Data is discovering creators…",
            }),
          );
        }
        candidates = discoverCandidates(
          p,
          records,
          config.keywords,
          config.depth,
        );
        if (!candidates.length && records.some((r) => r.error))
          throw new Error(
            "The scraper returned collection errors. Try another keyword or check scraper access.",
          );
        if (!candidates.length) {
          patch(p, {
            phase: "done",
            message: "No profiles matched. Try a broader topic.",
            count: 0,
          });
          saveJobs(jobRef.current.filter((j) => j.platform !== p));
          return;
        }
        append(candidates);
        job = { ...job, stage: "ready", snapshot: "", candidates };
        updateJob(job);
      }
      if (job.stage === "ready") {
        paused(signal);
        patch(p, {
          phase: "enriching",
          message: "Collecting profiles and public emails…",
          count: candidates.length,
        });
        job = await trigger(job, "enrich", key);
      }
      paused(signal);
      patch(p, {
        phase: "enriching",
        startedAt,
        snapshot: job.snapshot,
        message: "Collecting profiles and public emails…",
        count: candidates.length,
      });
      append(candidates);
      const records = await collect(job.snapshot, key, signal, () =>
        patch(p, { message: "Bright Data is enriching profiles…" }),
      );
      const enriched = enrichCreators(p, records, candidates, config.keywords);
      append(enriched);
      const emails = enriched.filter((c) => c.contacts.length).length;
      const partial = enriched.filter((c) => c.enrichmentError).length;
      patch(p, {
        phase: "done",
        message: `${enriched.length} creators · ${emails} with public email${partial ? ` · ${partial} partial profile(s)` : ""}${termWarning}`,
        count: enriched.length,
      });
      saveJobs(jobRef.current.filter((j) => j.platform !== p));
    } catch (e) {
      if (signal.aborted)
        patch(p, {
          phase: "idle",
          message: "Paused. Resume the existing collection.",
          count: candidates.length,
        });
      else
        patch(p, {
          phase: "error",
          message:
            e instanceof Error
              ? e.message
              : "Collection failed. Existing results are available.",
          count: candidates.length,
        });
    }
  }
  async function start(config: SearchConfig, key: string, resume = false) {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    setRunning(true);
    if (!resume) {
      results([]);
      setProgress(initialProgress());
      saveJobs(config.platforms.map(platform => ({ platform, stage: "queued", snapshot: "", createdAt: Date.now(), config })));
      persist("config", config);
    }
    if (resume && resultRef.current.some(c => c.sample)) results([]);
    const work = [...jobRef.current];
    // Only SERP requests are sequenced; all snapshot enrichment/polling stays independent.
    const run = (j: (typeof work)[number]) =>
      pipeline(
        j.config,
        j.platform,
        key,
        abort.signal,
        "stage" in j ? (j as Job) : undefined,
      );
    await Promise.allSettled(work.map(run));
    controller.current = null;
    setRunning(false);
  }
  function pause() {
    controller.current?.abort();
  }
  function discardJobs() {
    saveJobs([]);
  }
  function reconcileJob(platform: Platform, snapshot: string) {
    const job = jobRef.current.find(
      (j) => j.platform === platform && j.stage === "uncertain",
    );
    if (job && job.uncertainStage !== 'search' && /^s[dn]_[a-z0-9]{5,80}$/i.test(snapshot))
      updateJob({
        ...job,
        stage: job.uncertainStage === 'discover' ? 'discover' : "enrich",
        snapshot,
        message: undefined,
      });
  }
  function retrySearch(platform: Platform) {
    const job = jobRef.current.find(j => j.platform === platform && j.stage === 'uncertain' && j.uncertainStage === 'search');
    if (job) updateJob({ ...job, stage: 'queued', uncertainStage: undefined, message: undefined });
  }
  function showSample(data: Creator[]) {
    if (jobRef.current.length || controller.current) return;
    results(data);
    setProgress(initialProgress());
  }
  function updateCreator(creator: Creator) {
    if (resultRef.current.some(c => c.sample) !== Boolean(creator.sample)) return;
    if (resultRef.current.some(c => c.id === creator.id)) append([creator]);
  }
  return {
    creators,
    progress,
    running,
    jobs,
    storageWarning,
    start,
    pause,
    discardJobs,
    reconcileJob,
    retrySearch,
    showSample,
    updateCreator,
  };
}
