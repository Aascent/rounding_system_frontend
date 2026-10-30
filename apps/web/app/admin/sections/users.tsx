"use client";
import { paginate, type ManagedUser } from "@smart-rounding/contracts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { SelectField } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddButton, Panel, PanelHeading } from "./ui";

const roleOptions = [
  { value: "PHYSICIAN", label: "Physician" },
  { value: "NURSE_PRACTITIONER", label: "Nurse practitioner" },
  { value: "ADMIN", label: "Administrator" },
] as const;

export function UsersSection({
  users,
  onAddUser,
  onRoleChange,
  onToggleStatus,
  onResetPassword,
}: Readonly<{
  users: ManagedUser[];
  onAddUser: () => void;
  onRoleChange: (user: ManagedUser, role: ManagedUser["role"]) => void;
  onToggleStatus: (user: ManagedUser) => void;
  /** Issue a one-time password (backend only). */
  onResetPassword?: (user: ManagedUser) => void;
}>) {
  const [page, setPage] = useState(1);
  const pageData = paginate(users, { page, pageSize: 25 });

  return (
    <Panel>
      <PanelHeading
        title="User management"
        description="Create accounts, assign roles, and control access."
        action={<AddButton label="Add user" onClick={onAddUser} />}
      />
      <Table className="mt-4">
        <TableHeader>
          <TableRow className="border-0">
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageData.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="min-w-[220px]">
                <strong>{item.name}</strong>
                <span className="mt-0.5 block text-[0.78rem] text-muted-foreground">
                  {item.email}
                </span>
              </TableCell>
              <TableCell className="min-w-[190px]">
                <SelectField
                  ariaLabel={`Role for ${item.name}`}
                  value={item.role}
                  options={roleOptions}
                  size="sm"
                  onValueChange={(value) =>
                    onRoleChange(item, value as ManagedUser["role"])
                  }
                />
              </TableCell>
              <TableCell>{item.status}</TableCell>
              <TableCell>
                <div className="flex gap-2 whitespace-nowrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleStatus(item)}
                  >
                    {item.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                  {onResetPassword && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onResetPassword(item)}
                    >
                      Reset password
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="mt-4">
        <Pagination
          page={pageData.page}
          totalPages={pageData.totalPages}
          total={pageData.total}
          pageSize={pageData.pageSize}
          itemLabel="users"
          onPageChange={setPage}
        />
      </div>
    </Panel>
  );
}
