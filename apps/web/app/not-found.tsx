import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/page";

export default function NotFound() {
  return (
    <RouteState
      kicker="Not found"
      title="Record unavailable"
      description="The requested record does not exist or is no longer available."
    >
      <Button asChild>
        <Link href="/">Return to rounding list</Link>
      </Button>
    </RouteState>
  );
}
