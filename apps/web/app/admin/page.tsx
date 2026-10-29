import { AdminWorkspace } from "./workspace";
import { applicationData } from "../../lib/application-data";

export default async function AdminPage() {
  const data = await applicationData.adminData();
  return <AdminWorkspace data={data} initialSection="dashboard" />;
}
