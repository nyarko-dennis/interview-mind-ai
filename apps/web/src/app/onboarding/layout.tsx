import { OnboardingStepper } from '@/components/onboarding/OnboardingStepper';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <OnboardingStepper />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
