import { create } from 'zustand';
import type { UserPersona, InterviewerMode, UserTier } from '@interview-mind/shared';

interface OnboardingStore {
  calibrationScore: number;
  persona: UserPersona | null;
  mode: InterviewerMode;
  setCalibrationScore: (score: number) => void;
  setPersona: (persona: UserPersona) => void;
  setMode: (mode: InterviewerMode) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  calibrationScore: 0,
  persona: null,
  mode: 'GUIDED',
  setCalibrationScore: (calibrationScore) => set({ calibrationScore }),
  setPersona: (persona) => set({ persona }),
  setMode: (mode) => set({ mode }),
}));

// 10-question quiz → tier mapping
export function scoreToTier(score: number): UserTier {
  if (score <= 2) return 'NOVICE';
  if (score <= 5) return 'DEVELOPING';
  if (score <= 8) return 'PROFICIENT';
  return 'ADVANCED';
}
