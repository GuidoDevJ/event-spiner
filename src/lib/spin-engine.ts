import { IItem } from "./db/models/Item";

// Weighted random selection — O(n)
export function selectItemByWeight(items: IItem[]): IItem {
  const activeItems = items.filter((i) => i.isActive && i.weight > 0);
  if (!activeItems.length) throw new Error("No active items available");

  const total = activeItems.reduce((sum, i) => sum + i.weight, 0);
  let r = Math.random() * total;

  for (const item of activeItems) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return activeItems[activeItems.length - 1];
}

// Unambiguous alphanumeric characters (no 0/O, 1/I)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateCode(prefix: string): string {
  const randomPart = Array.from({ length: 8 }, () =>
    CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  ).join("");
  return `${prefix.toUpperCase()}-${randomPart}`;
}

export function isWinningSpinNumber(spinNumber: number, interval: number): boolean {
  return interval > 0 && spinNumber % interval === 0;
}
