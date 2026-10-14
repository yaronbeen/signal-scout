import { useRef, useState } from "react";
import { api, collect, CollectionFailedError, RequestError } from "./api";
import { compareRelevance, creatorsFromPosts, discoverCandidates, enrichCreators, mergeCreators, searchPostUrls } from "./data";
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
        current => current || "Browser storage is unavailable. Export results and keep this tab open to preserve job references.",
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
  function publishCandidates(p: Platform, next: Creator[]) {
    const selected = new Set(next.map(c => c.id));
    // A post author can displace an early SERP candidate. Remove displaced rows
    // while preserving contacts/evidence on selected rows and other platforms.
    results(mergeCreators(resultRef.current.filter(c => c.platform !== p || selected.has(c.id)), next));
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
    stage: "discover" | "posts" | "enrich",
    key: string,
  ): Promise<Job> {
    // Save uncertain state BEFORE a paid POST. A lost response must never auto-replay it.
    const uncertain: Job = {
      ...job,
      stage: "uncertain",
      snapshot: "",
      uncertainStage: stage,
      createdAt: Date.now(),
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
        ...(stage === "enrich" ? { urls: job.candidates!.map(c => c.url) } : stage === 'posts' ? {urls: job.postUrls} : {}),
      });
      if (typeof response.snapshot !== 'string' || !/^s[dn]_[a-z0-9]{5,80}$/i.test(response.snapshot)) throw new RequestError('Collection response had no valid snapshot ID. Check the Bright Data dashboard before retrying.', 0);
      const next: Job = {
        ...job,
        stage,
        snapshot: response.snapshot,
        createdAt: Date.now(),
      };
      patch(job.platform, { snapshot: next.snapshot });
      if (!updateJob(next)) {
        const message = `Collection accepted as ${next.snapshot}, but browser storage could not save its reference. Keep this tab open and copy this snapshot ID before refreshing. Resume checks this collection without resubmitting it.`;
        setStorageWarning(message);
        throw new Error(message);
      }
      return next;
    } catch (e) {
      // Only explicit 4xx rejections establish that no collection was accepted.
      if (e instanceof RequestError && e.status >= 400 && e.status < 500) {
        if (stage === "enrich" || stage === 'posts')
          updateJob({ ...job, stage: stage === 'posts' ? 'posts-ready' : "ready", snapshot: "" });
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
    searchZone = "",
  ) {
    let candidates = (existing?.candidates || []).slice().sort(compareRelevance).slice(0, config.depth);
    const startedAt = Date.now();
    let termWarning = existing?.warning || "";
    let job: Job = existing || {
      platform: p,
      stage: "discover",
      snapshot: "",
      createdAt: Date.now(),
      config,
    };
    if (job.candidates) job = { ...job, candidates };
    try {
      if (candidates.length) publishCandidates(p, candidates);
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
          const collected = [...(job.searchRecords || [])];
          let failures = job.searchFailures || 0;
          try {
            await previous; paused(signal);
            let offset = job.searchOffset || 0;
            while (true) {
              paused(signal);
              const uncertain: Job = { ...job, stage: 'uncertain', uncertainStage: 'search', message: 'The search response is unresolved. Search requests may already have been billed. Review your Bright Data usage before explicitly starting this search again.' };
              if (!updateJob(uncertain)) throw new Error('Cannot safely save search state. No paid search was submitted. Free browser storage and try again.');
              const batch = await api<{
                records: RawRecord[];
                failures?: { keyword: string; error: string }[];
                nextOffset?: number | null;
              }>("discover", key, {
                platform: p,
                keywords: config.keywords,
                depth: config.depth,
                offset,
                ...(searchZone ? { searchZone } : {}),
              });
              if (!Array.isArray(batch.records) || (batch.nextOffset != null && (batch.nextOffset !== offset + 6 || batch.nextOffset >= 48))) throw new RequestError('Unreadable search results. Review Bright Data usage before repeating this paid search.', 0);
              collected.push(...batch.records);
              failures += batch.failures?.length || 0;
              candidates = discoverCandidates(p, collected, config.keywords, config.depth);
              if (candidates.length) publishCandidates(p, candidates);
              if (batch.nextOffset == null) break;
              offset = batch.nextOffset;
              job = {...job, candidates, searchOffset:offset, searchRecords:collected.slice(), searchFailures:failures};
              if (!updateJob(job)) throw new Error('Cannot save collected search pages. Keep this tab open and free browser storage before resuming.');
              patch(p, {message:`Read ${collected.length} search pages; finding more creators…`, count:candidates.length});
            }
          } catch (e) {
            // HTTP status alone cannot prove whether the provider billed a dispatched search.
            // Preserve uncertainty for every failed search response; retries are explicit.
            throw e;
          } finally { release(); }
          records = collected;
          termWarning = failures
            ? ` · ${failures} search page(s) failed; successful pages preserved`
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
          const failures = records.filter(r => r.error).length;
          if (failures)
            termWarning += ` · ${failures} discovery record(s) failed; successful evidence preserved`;
        }
        candidates = discoverCandidates(
          p,
          records,
          config.keywords,
          config.depth,
        );
        const postUrls = ['instagram', 'linkedin', 'x'].includes(p) ? searchPostUrls(p, records, config.depth) : [];
        if (candidates.length) publishCandidates(p, candidates);
        if (postUrls.length) {
          job = {...job, stage: 'posts-ready', snapshot: '', candidates, postUrls, warning: termWarning};
          updateJob(job);
        } else {
          if (!candidates.length && records.some((r) => r.error))
            throw new CollectionFailedError("The scraper returned collection errors. Try another keyword or check scraper access.");
          if (!candidates.length) {
            patch(p, {phase: "done", message: `No profiles matched. Try a broader topic.${termWarning}`, count: 0});
            saveJobs(jobRef.current.filter(j => j.platform !== p));
            return;
          }
          job = { ...job, stage: "ready", snapshot: "", candidates, warning:termWarning };
          updateJob(job);
        }
      }
      if (job.stage === 'posts-ready') {
        paused(signal);
        patch(p, {phase: 'discovering', message: `Reading up to ${job.postUrls!.length} posts to identify matching authors…`, count: candidates.length});
        job = await trigger(job, 'posts', key);
      }
      if (job.stage === 'posts') {
        paused(signal);
        patch(p, {phase: 'discovering', snapshot: job.snapshot, message: 'Collecting post text and actual authors…', count: candidates.length});
        let records: RawRecord[];
        try {
          records = await collect(job.snapshot, key, signal, () => patch(p, {message:'Bright Data is collecting content evidence…'}));
        } catch (e) {
          // Only a confirmed terminal status can advance past the snapshot.
          // Network/timeouts remain resumable on the same paid collection.
          if (!(e instanceof CollectionFailedError) || !candidates.length) throw e;
          records = [];
          termWarning += ' · Post collection failed; discovered profiles preserved';
        }
        const authored = creatorsFromPosts(p, records, job.postUrls || [], config.keywords);
        candidates = mergeCreators(candidates, authored).sort(compareRelevance).slice(0, config.depth);
        if (records.some(r => r.error)) termWarning += ' · Some posts could not be collected; profile candidates preserved';
        if (!candidates.length) {
          if (records.some(r => r.error))
            throw new CollectionFailedError('Post collection returned errors and no usable authors. No matching-author conclusion is available. Check scraper access or try another topic.');
          patch(p, {phase:'done', message:'No matching authors or profile candidates found.', count:0});
          saveJobs(jobRef.current.filter(j => j.platform !== p));
          return;
        }
        publishCandidates(p, candidates);
        job = {...job, stage:'ready', snapshot:'', candidates, warning:termWarning};
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
      publishCandidates(p, candidates);
      let records: RawRecord[];
      let enrichmentFailure = '';
      try {
        records = await collect(job.snapshot, key, signal, () =>
          patch(p, { message: "Bright Data is enriching profiles…" }),
        );
      } catch (e) {
        if (!(e instanceof CollectionFailedError)) throw e;
        records = [];
        enrichmentFailure = 'Profile collection failed or was canceled. Discovery evidence is available.';
      }
      const enriched = enrichCreators(p, records, candidates, config.keywords).map(c =>
        enrichmentFailure ? { ...c, profileStatus: 'partial' as const, enrichmentError: enrichmentFailure } : c,
      );
      publishCandidates(p, enriched);
      const emails = enriched.filter((c) => c.contacts.length).length;
      const partial = enriched.filter((c) => c.enrichmentError).length;
      patch(p, {
        phase: "done",
        message: `${enriched.length} creators · ${emails} with public email${partial ? ` · ${partial} partial profile(s)` : ""}${termWarning}`,
        count: enriched.length,
      });
      saveJobs(jobRef.current.filter((j) => j.platform !== p));
    } catch (e) {
      if (e instanceof CollectionFailedError)
        saveJobs(jobRef.current.filter(j => j.platform !== p));
      if (candidates.length) publishCandidates(p, candidates);
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
  async function start(config: SearchConfig, key: string, resume = false, searchZone = "") {
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
        searchZone,
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
        stage: job.uncertainStage === 'discover' ? 'discover' : job.uncertainStage === 'posts' ? 'posts' : "enrich",
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
