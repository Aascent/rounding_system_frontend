"use client";
import type {
  CreateUserResponse,
  KeywordEntry,
  ManagedUser,
  RuleState,
  SyncStatus,
  Threshold,
} from "@smart-rounding/contracts";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeading } from "@/components/page";
import { ApiError, apiFetch } from "@/lib/api-client";
import type { AdminData } from "@/lib/application-data";
import { usesBackend } from "@/lib/backend";
import {
  KeywordForm,
  UserForm,
  type KeywordFormValues,
  type UserFormValues,
} from "./forms";
import { Modal } from "./modal";
import { AuditSection } from "./sections/audit";
import { DashboardSection } from "./sections/dashboard";
import { FacilitiesSection } from "./sections/facilities";
import { KeywordsSection } from "./sections/keywords";
import { RulesSection } from "./sections/rules";
import { SystemSection } from "./sections/system";
import { ThresholdsSection } from "./sections/thresholds";
import { DescRow } from "./sections/ui";
import { UsersSection } from "./sections/users";

export type AdminSection =
  | "dashboard"
  | "thresholds"
  | "rules"
  | "users"
  | "keywords"
  | "facilities"
  | "audit"
  | "system";

type Props = Readonly<{
  data: AdminData;
  initialSection: AdminSection;
}>;

const SYNC_POLL_MS = 1500;
/** The demo has no server, so its "sync" just completes after this long. */
const DEMO_SYNC_MS = 2500;

const errorText = (caught: unknown) =>
  caught instanceof ApiError
    ? caught.message
    : "Something went wrong. Please try again.";

export function AdminWorkspace({
  data: initial,
  initialSection: section,
}: Props) {
  const [data, setData] = useState<AdminData>(initial);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"user" | "keyword" | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState<{
    item: Threshold;
    value: number;
  } | null>(null);
  const pollTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(pollTimer.current), []);

  const patch = (changes: Partial<AdminData>) =>
    setData((current) => ({ ...current, ...changes }));

  /** Reload everything from the server after a change. */
  async function refresh(): Promise<void> {
    setData(await apiFetch<AdminData>("/admin/overview"));
  }

  /** Run a backend change, then refresh; report failures in the notice. */
  async function change(
    request: () => Promise<unknown>,
    success: string,
  ): Promise<boolean> {
    try {
      await request();
      await refresh();
      setNotice(success);
      return true;
    } catch (caught) {
      setNotice(errorText(caught));
      return false;
    }
  }

  async function saveThreshold(item: Threshold, value: number) {
    if (value < item.minimum || value > item.maximum) {
      setNotice(
        `Value must be between ${item.minimum} and ${item.maximum} ${item.unit}.`,
      );
      return;
    }
    if (usesBackend) {
      await change(
        () =>
          apiFetch(`/admin/thresholds/${item.id}`, {
            method: "PATCH",
            body: { value, version: item.version },
          }),
        `${item.label} updated. Today's lists were re-evaluated.`,
      );
      return;
    }
    patch({
      thresholds: data.thresholds.map((c) =>
        c.id === item.id
          ? {
              ...c,
              value,
              version: c.version + 1,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    });
    setNotice(`${item.label} updated.`);
  }

  async function toggleUserStatus(item: ManagedUser) {
    const status = item.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (usesBackend) {
      await change(
        () =>
          apiFetch(`/admin/users/${item.id}`, {
            method: "PATCH",
            body: { status },
          }),
        `${item.name} ${status === "ACTIVE" ? "activated" : "deactivated"}.`,
      );
      return;
    }
    patch({
      users: data.users.map((c) => (c.id === item.id ? { ...c, status } : c)),
    });
    setNotice(`${item.name} status changed.`);
  }

  async function changeUserRole(item: ManagedUser, role: ManagedUser["role"]) {
    if (usesBackend) {
      await change(
        () =>
          apiFetch(`/admin/users/${item.id}`, {
            method: "PATCH",
            body: { role },
          }),
        `${item.name}'s role changed. They will need to sign in again.`,
      );
      return;
    }
    patch({
      users: data.users.map((c) => (c.id === item.id ? { ...c, role } : c)),
    });
    setNotice(`${item.name} role changed.`);
  }

  async function resetPassword(item: ManagedUser) {
    try {
      const result = await apiFetch<{ temporaryPassword: string }>(
        `/admin/users/${item.id}/reset-password`,
        { method: "POST" },
      );
      await refresh();
      setNotice(
        `Temporary password for ${item.name}: ${result.temporaryPassword} — share it securely; it is shown only once.`,
      );
    } catch (caught) {
      setNotice(errorText(caught));
    }
  }

  async function toggleKeyword(id: string) {
    const item = data.keywords.find((k) => k.id === id);
    if (!item) return;
    if (usesBackend) {
      await change(
        () =>
          apiFetch(`/admin/keywords/${id}`, {
            method: "PATCH",
            body: { active: !item.active },
          }),
        `“${item.keyword}” ${item.active ? "disabled" : "enabled"}.`,
      );
      return;
    }
    patch({
      keywords: data.keywords.map((c) =>
        c.id === id ? { ...c, active: !c.active } : c,
      ),
    });
  }

  async function toggleRule(rule: RuleState) {
    if (usesBackend) {
      await change(
        () =>
          apiFetch(`/admin/rules/${rule.id}`, {
            method: "PATCH",
            body: { active: !rule.active },
          }),
        `“${rule.name}” ${rule.active ? "switched off" : "switched on"}. Today's lists were re-evaluated.`,
      );
      return;
    }
    patch({
      rules: data.rules.map((r) =>
        r.id === rule.id ? { ...r, active: !r.active } : r,
      ),
    });
    setNotice(
      `“${rule.name}” ${rule.active ? "switched off" : "switched on"}.`,
    );
  }

  async function createUser(values: UserFormValues): Promise<boolean> {
    if (usesBackend) {
      try {
        const created = await apiFetch<CreateUserResponse>("/admin/users", {
          method: "POST",
          body: { ...values, status: "ACTIVE" },
        });
        await refresh();
        setNotice(
          `${created.user.name} created. Temporary password: ${created.temporaryPassword} — share it securely; it is shown only once.`,
        );
        setModal(null);
        return true;
      } catch (caught) {
        setNotice(errorText(caught));
        return false;
      }
    }
    if (
      data.users.some(
        (u) => u.email.toLowerCase() === values.email.toLowerCase(),
      )
    ) {
      setNotice("A user with this email already exists.");
      return false;
    }
    const user: ManagedUser = {
      id: `user-${String(data.users.length + 1).padStart(3, "0")}`,
      name: values.name,
      email: values.email,
      role: values.role,
      status: "ACTIVE",
      providerId: null,
    };
    patch({ users: [...data.users, user] });
    setNotice(`${user.name} created.`);
    setModal(null);
    return true;
  }

  async function createKeyword(values: KeywordFormValues): Promise<boolean> {
    if (usesBackend) {
      const ok = await change(
        () =>
          apiFetch<KeywordEntry>("/admin/keywords", {
            method: "POST",
            body: { ...values, severity: "WARNING" },
          }),
        `${values.keyword} added to the keyword library.`,
      );
      if (ok) setModal(null);
      return ok;
    }
    if (
      data.keywords.some(
        (k) => k.keyword.toLowerCase() === values.keyword.toLowerCase(),
      )
    ) {
      setNotice("This keyword already exists.");
      return false;
    }
    patch({
      keywords: [
        ...data.keywords,
        {
          id: `kw-${data.keywords.length + 1}`,
          keyword: values.keyword,
          category: values.category,
          severity: "WARNING",
          matches: 0,
          active: true,
        },
      ],
    });
    setNotice(`${values.keyword} added to the keyword library.`);
    setModal(null);
    return true;
  }

  function openModal(type: "user" | "keyword") {
    setNotice("");
    setModal(type);
  }

  async function pollSync() {
    try {
      const sync = await apiFetch<SyncStatus>("/admin/sync");
      if (sync.status === "RUNNING") {
        patch({ sync });
        pollTimer.current = window.setTimeout(
          () => void pollSync(),
          SYNC_POLL_MS,
        );
        return;
      }
      await refresh();
      setNotice(
        sync.status === "SUCCEEDED"
          ? `Sync completed: ${sync.recordsProcessed.toLocaleString("en-US")} patients processed.`
          : "Sync failed. Check the system log and try again.",
      );
    } catch (caught) {
      setNotice(errorText(caught));
    }
  }

  async function triggerSync() {
    if (usesBackend) {
      try {
        const sync = await apiFetch<SyncStatus>("/admin/sync", {
          method: "POST",
        });
        patch({ sync });
        setNotice("Manual sync started.");
        pollTimer.current = window.setTimeout(
          () => void pollSync(),
          SYNC_POLL_MS,
        );
      } catch (caught) {
        setNotice(errorText(caught));
      }
      return;
    }
    const running: SyncStatus = {
      id: `sync-${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      trigger: "MANUAL",
      status: "RUNNING",
      recordsProcessed: 0,
      validationRejects: 0,
      errors: 0,
    };
    patch({ sync: running });
    setNotice("Manual sync started.");
    pollTimer.current = window.setTimeout(() => {
      const done: SyncStatus = {
        ...running,
        status: "SUCCEEDED",
        completedAt: new Date().toISOString(),
        recordsProcessed: data.census.patients,
      };
      setData((current) => ({
        ...current,
        sync: done,
        syncHistory: [
          { ...done, onLists: current.census.onListsToday },
          ...current.syncHistory,
        ].slice(0, 7),
      }));
      setNotice(
        `Sync completed: ${data.census.patients.toLocaleString("en-US")} patients processed.`,
      );
    }, DEMO_SYNC_MS);
  }

  return (
    <PageContainer>
      <PageHeading
        kicker="Administration"
        title="Operations and controls"
        description="Manage thresholds, rules, users, audit events, and synchronization status."
      />
      {notice && (
        <p
          className="mb-4 border-l-4 border-warning bg-warning-soft px-4 py-3.5 text-sm"
          role="status"
        >
          {notice}
        </p>
      )}

      {pendingThreshold && (
        <Modal
          title="Confirm threshold change"
          description={pendingThreshold.item.label}
          onClose={() => setPendingThreshold(null)}
        >
          <div className="mt-2">
            <dl className="grid grid-cols-2 gap-4">
              <DescRow term="Before">
                {pendingThreshold.item.value} {pendingThreshold.item.unit}
              </DescRow>
              <DescRow term="After">
                {pendingThreshold.value} {pendingThreshold.item.unit}
              </DescRow>
            </dl>
            <div className="mt-5 flex justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPendingThreshold(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void saveThreshold(
                    pendingThreshold.item,
                    pendingThreshold.value,
                  );
                  setPendingThreshold(null);
                }}
              >
                Confirm change
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {modal === "user" && (
        <Modal
          title="Add user"
          description={
            usesBackend
              ? "Create an account and assign its initial role. A one-time password is shown after saving."
              : "Create an account and assign its initial role."
          }
          onClose={() => setModal(null)}
        >
          {notice && (
            <p className="text-sm font-bold text-destructive" role="alert">
              {notice}
            </p>
          )}
          <UserForm onSubmit={createUser} />
        </Modal>
      )}
      {modal === "keyword" && (
        <Modal
          title="Add keyword"
          description="Add a phrase to the review library."
          onClose={() => setModal(null)}
        >
          {notice && (
            <p className="text-sm font-bold text-destructive" role="alert">
              {notice}
            </p>
          )}
          <KeywordForm onSubmit={createKeyword} />
        </Modal>
      )}

      {section === "dashboard" && (
        <DashboardSection
          users={data.users}
          keywords={data.keywords}
          sync={data.sync}
          census={data.census}
          facilities={data.facilities}
          history={data.syncHistory}
          onAddUser={() => openModal("user")}
          onAddKeyword={() => openModal("keyword")}
          onToggleKeyword={(id) => void toggleKeyword(id)}
        />
      )}
      {section === "thresholds" && (
        <ThresholdsSection
          thresholds={data.thresholds}
          onReview={(item, value) => setPendingThreshold({ item, value })}
        />
      )}
      {section === "rules" && (
        <RulesSection
          rules={data.rules}
          onToggle={(rule) => void toggleRule(rule)}
        />
      )}
      {section === "users" && (
        <UsersSection
          users={data.users}
          onAddUser={() => openModal("user")}
          onRoleChange={(item, role) => void changeUserRole(item, role)}
          onToggleStatus={(item) => void toggleUserStatus(item)}
          {...(usesBackend
            ? {
                onResetPassword: (item: ManagedUser) =>
                  void resetPassword(item),
              }
            : {})}
        />
      )}
      {section === "audit" && <AuditSection events={data.auditEvents} />}
      {section === "keywords" && (
        <KeywordsSection
          keywords={data.keywords}
          onAddKeyword={() => openModal("keyword")}
          onToggle={(id) => void toggleKeyword(id)}
        />
      )}
      {section === "facilities" && (
        <FacilitiesSection facilities={data.facilities} />
      )}
      {section === "system" && (
        <SystemSection
          sync={data.sync}
          history={data.syncHistory}
          onTriggerSync={() => void triggerSync()}
        />
      )}
    </PageContainer>
  );
}
