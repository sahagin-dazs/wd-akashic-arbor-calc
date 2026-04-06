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
const OPTIMIZER_INACTIVITY_TIMEOUT_MS = 15000;

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
    let inactivityTimer: number | null = null;

    const resetInactivityTimer = () => {
      if (inactivityTimer != null) {
        window.clearTimeout(inactivityTimer);
      }
      inactivityTimer = window.setTimeout(() => {
        console.error(`[akashic] run ${id} timed out waiting for worker activity`);
        settle(
          reject,
          new Error(
            `Optimizer stalled after ${OPTIMIZER_INACTIVITY_TIMEOUT_MS / 1000}s without worker activity`
          )
        );
      }, OPTIMIZER_INACTIVITY_TIMEOUT_MS);
    };

    const cleanup = () => {
      if (inactivityTimer != null) {
        window.clearTimeout(inactivityTimer);
        inactivityTimer = null;
      }
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
      console.warn(`[akashic] run ${id} aborted`);
      settle(reject, createAbortError());
    };

    if (signal) {
      signal.addEventListener("abort", abortHandler, { once: true });
    }

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.id !== id) return;
      resetInactivityTimer();

      if (data.type === "progress") {
        console.info(
          `[akashic] run ${id} progress ${(Math.min(1, Math.max(0, data.progress)) * 100).toFixed(1)}%`
        );
        onProgress?.(Math.min(1, Math.max(0, data.progress)));
        return;
      }

      if (data.type === "result") {
        console.info(`[akashic] run ${id} completed`);
        settle(resolve, data.result);
        return;
      }

      console.error(`[akashic] run ${id} failed`, data.error);
      settle(reject, new Error(data.error));
    };

    worker.onerror = (event) => {
      const error =
        event.error instanceof Error
          ? event.error
          : new Error(event.message || "Optimizer worker crashed");
      console.error(`[akashic] run ${id} worker error`, error);
      settle(reject, error);
    };

    worker.onmessageerror = () => {
      console.error(`[akashic] run ${id} unreadable worker response`);
      settle(reject, new Error("Optimizer worker returned an unreadable response"));
    };

    const payload: OptimizerInput = { ownedHeroes, lineup, nightmareLevel };
    const message: WorkerRequest = { id, payload };
    console.info(`[akashic] run ${id} started`, {
      nightmareLevel,
      heroCount: ownedHeroes.length,
      lineup: lineup.slots.map((slot) => slot.heroId)
    });
    resetInactivityTimer();
    worker.postMessage(message);
  });
}
