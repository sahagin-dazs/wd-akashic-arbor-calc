<script setup lang="ts">
import type { Role, Element } from "../models/types";

type RoleOption = {
  id: Role;
  label: string;
  icon: string;
  color: string;
};

type ElementOption = {
  id: Element;
  label: string;
  icon: string;
  color: string;
};

import type { Rarity } from "../models/types";

const props = defineProps<{
  selectedRoles: Role[];
  selectedElements: Element[];
  selectedRarities: Rarity[];
}>();

const emit = defineEmits<{
  "toggle-role": [role: Role];
  "toggle-element": [element: Element];
  "toggle-rarity": [rarity: Rarity];
}>();

const roleOptions: RoleOption[] = [
  {
    id: "Ranger",
    label: "Ranger",
    icon: "fa-solid fa-person-rifle",
    color: "#38bdf8"
  },
  {
    id: "Fighter",
    label: "Fighter",
    icon: "fa-solid fa-hand-fist",
    color: "#facc15"
  },
  {
    id: "Support",
    label: "Support",
    icon: "fa-solid fa-heart",
    color: "#22c55e"
  },
  {
    id: "Mage",
    label: "Mage",
    icon: "fa-solid fa-wand-magic-sparkles",
    color: "#c084fc"
  }
];

const elementOptions: ElementOption[] = [
  {
    id: "Fire",
    label: "Fire",
    icon: "fa-solid fa-fire",
    color: "#ef4444"
  },
  {
    id: "Ice",
    label: "Ice",
    icon: "fa-solid fa-snowflake",
    color: "#60a5fa"
  },
  {
    id: "Wind",
    label: "Wind",
    icon: "fa-solid fa-wind",
    color: "#34d399"
  },
  {
    id: "Electro",
    label: "Electro",
    icon: "fa-solid fa-bolt",
    color: "#facc15"
  },
  {
    id: "Xeno",
    label: "Xeno",
    icon: "fa-solid fa-star-of-david",
    color: "#a855f7"
  }
];

function onRoleToggle(role: Role) {
  emit("toggle-role", role);
}

function onElementToggle(element: Element) {
  emit("toggle-element", element);
}

const rarityOptions: Array<{ id: Rarity; label: string }> = [
  {
    id: "Sublime",
    label: "Sublime"
  },
  {
    id: "Mythic",
    label: "Mythic"
  },
  {
    id: "Legendary",
    label: "Legendary"
  },
  {
    id: "Epic",
    label: "Epic"
  },
  {
    id: "Common",
    label: "Common"
  }
];

function onRarityToggle(rarity: Rarity) {
  emit("toggle-rarity", rarity);
}

function isRoleActive(role: Role) {
  return props.selectedRoles.includes(role);
}

function isElementActive(element: Element) {
  return props.selectedElements.includes(element);
}

function isRarityActive(rarity: Rarity) {
  return props.selectedRarities.includes(rarity);
}
</script>

<template>
  <div class="filters-grid">
    <div class="filter-group">
      <div class="filter-title">Roles</div>
      <div class="filter-options">
        <button
          v-for="option in roleOptions"
          :key="option.id"
          type="button"
          class="filter-chip"
          :class="{ active: isRoleActive(option.id) }"
          @click="onRoleToggle(option.id)"
        >
          <i :class="option.icon" :style="{ color: option.color }" aria-hidden="true"></i>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
    <div class="filter-group">
      <div class="filter-title">Elements</div>
      <div class="filter-options">
        <button
          v-for="option in elementOptions"
          :key="option.id"
          type="button"
          class="filter-chip"
          :class="{ active: isElementActive(option.id) }"
          @click="onElementToggle(option.id)"
        >
          <i :class="option.icon" :style="{ color: option.color }" aria-hidden="true"></i>
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
    <div class="filter-group">
      <div class="filter-title">Rarity</div>
      <div class="filter-options">
        <button
          v-for="option in rarityOptions"
          :key="option.id"
          type="button"
          class="filter-chip rarity-chip"
          :class="[
            `rarity-${option.id.toLowerCase()}`,
            { active: isRarityActive(option.id) }
          ]"
          @click="onRarityToggle(option.id)"
        >
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
