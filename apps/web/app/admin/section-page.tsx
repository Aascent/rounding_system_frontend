import { applicationData } from "../../lib/application-data";
import { AdminWorkspace, type AdminSection } from "./workspace";

export async function AdminSectionPage({ section }: { section: AdminSection }) {
  const data = await applicationData.adminData();
  return <AdminWorkspace data={data} initialSection={section} />;
}
