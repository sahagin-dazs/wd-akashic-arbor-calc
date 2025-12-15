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
};

let optimizerWorker: Worker | null = null;
const pendingJobs = new Map<number, PendingJob>();
let jobCounter = 0;

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
      job.resolve(data.result);
      pendingJobs.delete(data.id);
    } else if (data.type === "error") {
      job.reject(new Error(data.error));
      pendingJobs.delete(data.id);
    }
  };
  optimizerWorker.onerror = (err) => {
    pendingJobs.forEach((job) => job.reject(err.error ?? err));
    pendingJobs.clear();
  };
  return optimizerWorker;
}

export function runOptimization(
  ownedHeroes: OwnedHero[],
  lineup: Lineup,
  nightmareLevel: number,
  onProgress?: (value: number) => void
): Promise<OptimizationResult> {
  const worker = ensureWorker();
  return new Promise<OptimizationResult>((resolve, reject) => {
    const id = ++jobCounter;
    pendingJobs.set(id, { resolve, reject, onProgress });
    const payload: OptimizerInput = { ownedHeroes, lineup, nightmareLevel };
    const message: WorkerRequest = { id, payload };
    worker.postMessage(message);
  });
}
