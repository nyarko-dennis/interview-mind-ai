import type { InterviewerMode } from './session';

export type UserTier = 'NOVICE' | 'DEVELOPING' | 'PROFICIENT' | 'ADVANCED';

export type UserPersona = 'JOB_SEEKER' | 'SKILL_BUILDER' | 'STUDENT';

export interface User {
  id: string;
  email: string;
  displayName: string;
  tier: UserTier;
  persona?: UserPersona;
  preferredMode: InterviewerMode;
  calibrationScore?: number;
  onboardingComplete: boolean;
}
