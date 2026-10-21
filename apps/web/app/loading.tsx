import { RouteState, Spinner } from "@/components/page";

export default function Loading() {
  return (
    <RouteState
      kicker="Please wait"
      title="Loading workspace"
      description="Preparing the requested view."
      role="status"
      live="polite"
    >
      <Spinner className="mx-auto" />
    </RouteState>
  );
}
