<script setup lang="ts">
import { computed } from "vue";
import {
  getNodeStatuses,
  NODE_TREE_LAYOUT,
  nodeKeyId,
  formatNodeLabel
} from "../models/nodeConfig";

const props = defineProps<{
  nightmareLevel: number;
  optimizeDisabled?: boolean;
  lineupReady?: boolean;
  allClassified?: boolean;
  isCalculating?: boolean;
}>();

const emit = defineEmits<{
  "update:nightmareLevel": [value: number];
  optimize: [];
}>();

function onChange(e: Event) {
  const val = Number((e.target as HTMLInputElement).value);
  emit("update:nightmareLevel", Number.isNaN(val) ? 0 : val);
}

const nodeStatuses = computed(() => getNodeStatuses(props.nightmareLevel));

function statusFor(key: ReturnType<typeof nodeKeyId>) {
  return nodeStatuses.value.find(
    (status) => nodeKeyId(status.key) === key
  );
}

function slotArray(unlocked: number) {
  return Array.from({ length: 3 }, (_, idx) => idx < unlocked);
}
</script>

<template>
  <div class="settings-shell">
    <div class="settings-header">
      <div>
        <div class="panel-title">Nightmare Progress</div>
        <p class="settings-subtitle">
          Unlock slots as you clear higher nightmare levels.
        </p>
      </div>
    </div>
    <div class="settings-row">
      <div class="nightmare-column">
        <label class="nightmare-control">
          <span>Nightmare Level</span>
          <input
            class="nightmare-input"
            type="number"
            min="0"
            max="999"
            :value="nightmareLevel"
            @input="onChange"
          />
        </label>
        <button class="btn btn-lg optimize-btn" :disabled="props.optimizeDisabled" @click="emit('optimize')">
          Optimize Arbor
        </button>
        <div v-if="props.isCalculating" class="calc-indicator">
          <span class="spinner"></span>
          <span>Calculating...</span>
        </div>
        <div class="settings-hint">
          <p v-if="!props.allClassified">
            Set every hero to a star level or mark them as not owned to enable optimization.
          </p>
          <p v-else-if="!props.lineupReady">
            Fill all five lineup slots to optimize the arbor.
          </p>
          <p v-else>
            Ready to optimize with the latest nightmare level.
          </p>
        </div>
      </div>
      <div class="slot-summary-panel">
        <div class="slot-summary-title">Available Node Slots</div>
        <div class="node-tree mini">
          <div
            v-for="(tier, tierIdx) in NODE_TREE_LAYOUT"
            :key="tierIdx"
            class="node-tier"
          >
            <div
              v-for="node in tier"
              :key="nodeKeyId(node)"
              class="node-status-card"
            >
              <div class="node-status-header">
                {{ formatNodeLabel(node) }}
              </div>
              <div class="node-slots" v-if="statusFor(nodeKeyId(node))">
                <span
                  v-for="(isUnlocked, idx) in slotArray(
                    statusFor(nodeKeyId(node))!.unlocked
                  )"
                  :key="idx"
                  :class="['slot-dot', { unlocked: isUnlocked }]"
                ></span>
              </div>
              <div class="node-status-meta" v-if="statusFor(nodeKeyId(node))">
                <template v-if="statusFor(nodeKeyId(node))!.nextUnlock !== null">
                  Slot {{ statusFor(nodeKeyId(node))!.unlocked + 1 }} at
                  Nightmare {{ statusFor(nodeKeyId(node))!.nextUnlock }}
                </template>
                <template v-else>
                  All slots unlocked
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
