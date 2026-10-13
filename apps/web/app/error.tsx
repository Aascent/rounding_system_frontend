"use client";

import { Button } from "@/components/ui/button";
import { RouteState } from "@/components/page";

export default function ErrorPage({
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <RouteState
      kicker="Unable to load"
      title="Something went wrong"
      description="The workspace could not be prepared. No clinical action was performed."
      role="alert"
    >
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </RouteState>
  );
}
