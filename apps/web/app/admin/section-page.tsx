import { applicationData } from "../../lib/application-data";
import { AdminWorkspace, type AdminSection } from "./workspace";

export async function AdminSectionPage({ section }: { section: AdminSection }) {
  const data = await applicationData.adminData();
  return (
    <AdminWorkspace
      initialThresholds={data.thresholds}
      initialUsers={data.users}
      auditEvents={data.auditEvents}
      initialSync={data.sync}
      initialSection={section}
    />
  );
}
