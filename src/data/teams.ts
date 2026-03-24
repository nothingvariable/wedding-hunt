export const TEAMS = {
  bride: { key: "bride", name: "Team Bride", emoji: "👰" },
  groom: { key: "groom", name: "Team Groom", emoji: "🤵" },
} as const;

export type TeamKey = keyof typeof TEAMS;
