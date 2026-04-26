import { Topbar } from "@/components/layout/topbar";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardPage() {
  return (
    <>
      <Topbar
        title="Welcome to MediaFlow"
        subtitle="connect your brand · or load demo data to start exploring"
      />
      <div className="px-7 py-8">
        <OnboardingWizard />
      </div>
    </>
  );
}
