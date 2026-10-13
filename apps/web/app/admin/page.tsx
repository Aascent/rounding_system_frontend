import { AdminWorkspace } from "./workspace";
import { applicationData } from "../../lib/application-data";

export default async function AdminPage() {
  const data = await applicationData.adminData();
  return (
    <AdminWorkspace
      initialThresholds={data.thresholds}
      initialUsers={data.users}
      auditEvents={data.auditEvents}
      initialSync={data.sync}
      initialSection="dashboard"
    />
  );
}
