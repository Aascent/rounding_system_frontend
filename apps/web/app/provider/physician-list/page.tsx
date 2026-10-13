import { redirect } from "next/navigation";

/**
 * The physician and NP rounding lists merged into one role-scoped
 * `/provider/patient-list` (see that route). This redirect keeps any
 * bookmarked or shared link to the old physician-only list working.
 */
export default function PhysicianListRedirect() {
  redirect("/provider/patient-list");
}
