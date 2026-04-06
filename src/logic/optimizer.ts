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

let jobCounter = 0;

function createAbortError() {
  return new DOMException("Optimization canceled", "AbortError");
}

function createWorker() {
  return new Worker(new URL("./optimizerWorker.ts", import.meta.url), {
    type: "module"
  });
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

  return new Promise<OptimizationResult>((resolve, reject) => {
    const id = ++jobCounter;
    const worker = createWorker();
    let settled = false;

    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.onmessageerror = null;
      worker.terminate();
      signal?.removeEventListener("abort", abortHandler);
    };

    const settle = (
      handler: (value: OptimizationResult | Error) => void,
      value: OptimizationResult | Error
    ) => {
      if (settled) return;
      settled = true;
      cleanup();
      handler(value);
    };

    const abortHandler = () => {
      settle(reject, createAbortError());
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;

      if (data.type === "progress") {
        onProgress?.(Math.min(1, Math.max(0, data.progress)));
        return;
      }

      if (data.type === "result") {
        settle(resolve, data.result);
        return;
      }

      settle(reject, new Error(data.error));
    };

    worker.onerror = (event) => {
      const error =
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "Optimizer worker crashed");
      settle(reject, error);
    };

    worker.onmessageerror = () => {
      settle(reject, new Error("Optimizer worker returned an unreadable response"));
    };

    const payload: OptimizerInput = { ownedHeroes, lineup, nightmareLevel };
    const message: WorkerRequest = { id, payload };
    worker.postMessage(message);
  });
}
