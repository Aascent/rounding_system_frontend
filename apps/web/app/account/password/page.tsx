"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PageContainer, PageHeading } from "@/components/page";
import { usesBackend } from "@/lib/backend";
import { ChangePasswordForm } from "../../change-password-form";

/** Any signed-in user can replace their own password. */
export default function ChangePasswordPage() {
  const [changed, setChanged] = useState(false);
  return (
    <PageContainer>
      <PageHeading
        kicker="Account"
        title="Change password"
        description="Your other signed-in devices are signed out when you change it."
      />
      <Card className="max-w-[480px]">
        <CardContent>
          {usesBackend ? (
            <>
              {changed && (
                <p
                  role="status"
                  className="mb-4 border-l-4 border-primary bg-secondary px-4 py-3 text-sm"
                >
                  Your password has been changed.
                </p>
              )}
              <ChangePasswordForm onChanged={() => setChanged(true)} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Passwords can be changed once the app is connected to its backend.
              The demo accounts use a fixed password.
            </p>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
