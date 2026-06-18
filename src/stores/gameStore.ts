"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SpinResult } from "@/types/models";

interface GameState {
  sessionId: string | null;
  playerData: Record<string, string> | null;
  lastResult: SpinResult | null;
  setSessionId: (id: string) => void;
  setPlayerData: (data: Record<string, string>) => void;
  setLastResult: (result: SpinResult) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      sessionId: null,
      playerData: null,
      lastResult: null,
      setSessionId: (sessionId) => set({ sessionId }),
      setPlayerData: (playerData) => set({ playerData }),
      setLastResult: (lastResult) => set({ lastResult }),
      reset: () => set({ lastResult: null }),
    }),
    { name: "eventspin-game" }
  )
);
