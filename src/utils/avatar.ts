const AVATAR_OVERRIDES: Record<string, string> = {
  UL: "UnyieldingLancer",
  RogueFM: "RogueFireMage"
};

const NON_ALPHANUMERIC = /[^a-z0-9]/gi;

function sanitizeKey(value: string) {
  return value.replace(NON_ALPHANUMERIC, "");
}

export function avatarKey(heroId?: string | null, heroName?: string) {
  const raw =
    (heroId && (AVATAR_OVERRIDES[heroId] ?? heroId)) ?? heroName ?? "";
  return sanitizeKey(raw);
}

export function avatarUrl(heroId?: string | null, heroName?: string) {
  const key = avatarKey(heroId, heroName);
  return key ? `/avatars/${key}.png` : "";
}
