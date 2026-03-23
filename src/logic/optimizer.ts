import type { Lineup, OptimizationResult, OwnedHero } from "../models/types";
import type { OptimizerInput } from "./optimizerCore";

interface WorkerRequest {
  id: number;
  payload: OptimizerInput;
}

type WorkerResponse =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "result"; result: OptimizationResult }
  | { id: number; type: "error"; error: string };

type PendingJob = {
  resolve: (result: OptimizationResult) => void;
  reject: (error: Error) => void;
  onProgress?: (value: number) => void;
  cleanup?: () => void;
};

let optimizerWorker: Worker | null = null;
const pendingJobs = new Map<number, PendingJob>();
let jobCounter = 0;

function createAbortError() {
  return new DOMException("Optimization canceled", "AbortError");
}

function rejectAllPending(error: Error) {
  pendingJobs.forEach((job) => {
    job.cleanup?.();
    job.reject(error);
  });
  pendingJobs.clear();
}

function resetWorker(error?: Error) {
  if (optimizerWorker) {
    optimizerWorker.terminate();
    optimizerWorker = null;
  }
  if (error) {
    rejectAllPending(error);
  }
}

function ensureWorker() {
  if (optimizerWorker) return optimizerWorker;
  optimizerWorker = new Worker(
    new URL("./optimizerWorker.ts", import.meta.url),
    { type: "module" }
  );
  optimizerWorker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const data = event.data;
    const job = pendingJobs.get(data.id);
    if (!job) return;
    if (data.type === "progress") {
      job.onProgress?.(Math.min(1, Math.max(0, data.progress)));
    } else if (data.type === "result") {
      job.cleanup?.();
      job.resolve(data.result);
      pendingJobs.delete(data.id);
    } else if (data.type === "error") {
      job.cleanup?.();
      job.reject(new Error(data.error));
      pendingJobs.delete(data.id);
    }
  };
  optimizerWorker.onerror = (err) => {
    resetWorker((err.error ?? err) as Error);
  };
  return optimizerWorker;
}

export function runOptimization(
  ownedHeroes: OwnedHero[],
  lineup: Lineup,
  nightmareLevel: number,
  onProgress?: (value: number) => void,
  signal?: AbortSignal
): Promise<OptimizationResult> {
  if (signal?.aborted) {
    return Promise.reject(createAbortError());
  }

  const worker = ensureWorker();
  return new Promise<OptimizationResult>((resolve, reject) => {
    const id = ++jobCounter;
    const cleanup = () => {
      if (signal) {
        signal.removeEventListener("abort", abortHandler);
      }
    };
    const abortHandler = () => {
      const job = pendingJobs.get(id);
      if (!job) return;
      pendingJobs.delete(id);
      job.cleanup?.();
      job.reject(createAbortError());
      resetWorker(createAbortError());
    };
    if (signal) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    pendingJobs.set(id, { resolve, reject, onProgress, cleanup });
    const payload: OptimizerInput = { ownedHeroes, lineup, nightmareLevel };
    const message: WorkerRequest = { id, payload };
    worker.postMessage(message);
  });
}
