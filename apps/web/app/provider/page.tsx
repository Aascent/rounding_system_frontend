import { applicationData } from "../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import { ProviderDashboard } from "./dashboard";

export default async function ProviderPage() {
  const role = await getSessionRole();
  const scopeRole =
    role === "PHYSICIAN" || role === "NURSE_PRACTITIONER" ? role : undefined;
  const { dashboard, insights } =
    await applicationData.providerSummary(scopeRole);
  return <ProviderDashboard dashboard={dashboard} insights={insights} />;
}
