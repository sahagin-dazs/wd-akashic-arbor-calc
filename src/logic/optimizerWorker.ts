/// <reference lib="webworker" />

import {
  runOptimizationCore,
  type OptimizerInput
} from "./optimizerCore";

import type { OptimizationResult } from "../models/types";

interface WorkerRequest {
  id: number;
  payload: OptimizerInput;
}

type WorkerResponse =
  | { id: number; type: "progress"; progress: number }
  | { id: number; type: "result"; result: OptimizationResult }
  | { id: number; type: "error"; error: string };

const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, payload } = event.data;
  try {
    const result = runOptimizationCore(payload, (progress) => {
      const response: WorkerResponse = {
        id,
        type: "progress",
        progress
      };
      ctx.postMessage(response);
    });
    const done: WorkerResponse = { id, type: "result", result };
    ctx.postMessage(done);
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: "error",
      error: error instanceof Error ? error.message : String(error)
    };
    ctx.postMessage(response);
  }
};
