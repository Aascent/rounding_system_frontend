import { applicationData } from "../../lib/application-data";
import { getSessionRole } from "@/lib/session";
import { ProviderDashboard } from "./dashboard";

export default async function ProviderPage() {
  const role = await getSessionRole();
  const scopeRole =
    role === "PHYSICIAN" || role === "NURSE_PRACTITIONER" ? role : undefined;
  const [{ dashboard, insights }, preview] = await Promise.all([
    applicationData.providerSummary(scopeRole),
    applicationData.roundingListPage({ page: 1, pageSize: 12 }, scopeRole),
  ]);
  return (
    <ProviderDashboard
      dashboard={dashboard}
      insights={insights}
      preview={preview.items}
      previewTotal={preview.total}
    />
  );
}
