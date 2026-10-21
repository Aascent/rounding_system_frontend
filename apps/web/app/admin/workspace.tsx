"use client";
import {
  syntheticKeywordLibrary,
  type AuditEvent,
  type ManagedUser,
  type SyncStatus,
  type Threshold,
} from "@smart-rounding/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeading } from "@/components/page";
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
import { SystemSection } from "./sections/system";
import { ThresholdsSection } from "./sections/thresholds";
import { DescRow } from "./sections/ui";
import { UsersSection } from "./sections/users";

export type AdminSection =
  | "dashboard"
  | "thresholds"
  | "users"
  | "keywords"
  | "facilities"
  | "audit"
  | "system";

type Props = Readonly<{
  initialThresholds: Threshold[];
  initialUsers: ManagedUser[];
  auditEvents: AuditEvent[];
  initialSync: SyncStatus;
  initialSection: AdminSection;
}>;

export function AdminWorkspace({
  initialThresholds,
  initialUsers,
  auditEvents,
  initialSync,
  initialSection: section,
}: Props) {
  const [thresholds, setThresholds] = useState(initialThresholds);
  const [users, setUsers] = useState(initialUsers);
  const [keywords, setKeywords] = useState(syntheticKeywordLibrary);
  const [sync, setSync] = useState(initialSync);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState<"user" | "keyword" | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState<{
    item: Threshold;
    value: number;
  } | null>(null);

  function saveThreshold(item: Threshold, value: number) {
    if (value < item.minimum || value > item.maximum) {
      setNotice(
        `Value must be between ${item.minimum} and ${item.maximum} ${item.unit}.`,
      );
      return;
    }
    setThresholds((current) =>
      current.map((c) =>
        c.id === item.id
          ? {
              ...c,
              value,
              version: c.version + 1,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    );
    setNotice(`${item.label} updated.`);
  }

  function toggleUserStatus(item: ManagedUser) {
    setUsers((current) =>
      current.map((c) =>
        c.id === item.id
          ? { ...c, status: c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
          : c,
      ),
    );
    setNotice(`${item.name} status changed.`);
  }

  function changeUserRole(item: ManagedUser, role: ManagedUser["role"]) {
    setUsers((current) =>
      current.map((c) => (c.id === item.id ? { ...c, role } : c)),
    );
    setNotice(`${item.name} role changed.`);
  }

  function toggleKeyword(id: string) {
    setKeywords((current) =>
      current.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
  }

  function createUser(values: UserFormValues): boolean {
    if (
      users.some((u) => u.email.toLowerCase() === values.email.toLowerCase())
    ) {
      setNotice("A user with this email already exists.");
      return false;
    }
    const user: ManagedUser = {
      id: `user-${String(users.length + 1).padStart(3, "0")}`,
      name: values.name,
      email: values.email,
      role: values.role,
      status: "ACTIVE",
      providerId: null,
    };
    setUsers((current) => [...current, user]);
    setNotice(`${user.name} created.`);
    setModal(null);
    return true;
  }

  function createKeyword(values: KeywordFormValues): boolean {
    if (
      keywords.some(
        (k) => k.keyword.toLowerCase() === values.keyword.toLowerCase(),
      )
    ) {
      setNotice("This keyword already exists.");
      return false;
    }
    setKeywords((current) => [
      ...current,
      {
        id: `kw-${current.length + 1}`,
        keyword: values.keyword,
        category: values.category,
        severity: "WARNING",
        matches: 0,
        active: true,
      },
    ]);
    setNotice(`${values.keyword} added to the keyword library.`);
    setModal(null);
    return true;
  }

  function openModal(type: "user" | "keyword") {
    setNotice("");
    setModal(type);
  }

  function triggerSync() {
    setSync({
      id: `sync-${Date.now()}`,
      startedAt: new Date().toISOString(),
      completedAt: null,
      trigger: "MANUAL",
      status: "RUNNING",
      recordsProcessed: 0,
      validationRejects: 0,
      errors: 0,
    });
    setNotice("Manual sync started.");
  }

  return (
    <PageContainer>
      <PageHeading
        kicker="Administration"
        title="Operations and controls"
        description="Manage thresholds, users, audit events, and synchronization status."
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
                  saveThreshold(pendingThreshold.item, pendingThreshold.value);
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
          description="Create an account and assign its initial role."
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
          users={users}
          keywords={keywords}
          sync={sync}
          patientsToday={initialSync.recordsProcessed}
          onAddUser={() => openModal("user")}
          onAddKeyword={() => openModal("keyword")}
          onToggleKeyword={toggleKeyword}
        />
      )}
      {section === "thresholds" && (
        <ThresholdsSection
          thresholds={thresholds}
          onReview={(item, value) => setPendingThreshold({ item, value })}
        />
      )}
      {section === "users" && (
        <UsersSection
          users={users}
          onAddUser={() => openModal("user")}
          onRoleChange={changeUserRole}
          onToggleStatus={toggleUserStatus}
        />
      )}
      {section === "audit" && <AuditSection events={auditEvents} />}
      {section === "keywords" && (
        <KeywordsSection
          keywords={keywords}
          onAddKeyword={() => openModal("keyword")}
          onToggle={toggleKeyword}
        />
      )}
      {section === "facilities" && <FacilitiesSection />}
      {section === "system" && (
        <SystemSection sync={sync} onTriggerSync={triggerSync} />
      )}
    </PageContainer>
  );
}
