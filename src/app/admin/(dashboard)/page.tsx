import { PageHeader } from "@/components/page-header";
import { getOverview } from "@/lib/admin-data";
import { isRegistrationOpen } from "@/lib/enrollment";
import { formatDateTime } from "@/lib/format";
import { getRegistrationWindow } from "@/lib/settings";
import { OverviewView } from "./overview-view";

export default async function AdminOverviewPage() {
  const [overview, registration] = await Promise.all([getOverview(), getRegistrationWindow()]);
  const now = new Date();

  let status: string;
  if (isRegistrationOpen(registration, now)) {
    status = registration.closesAt ? `Open until ${formatDateTime(registration.closesAt)}` : "Open";
  } else if (registration.opensAt && now < registration.opensAt) {
    status = `Opens ${formatDateTime(registration.opensAt)}`;
  } else {
    status = registration.opensAt ? "Closed" : "Not scheduled";
  }

  return (
    <>
      <PageHeader title="Overview" />
      <OverviewView overview={overview} registrationStatus={status} />
    </>
  );
}
