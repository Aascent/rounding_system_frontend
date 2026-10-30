"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Server,
  SlidersHorizontal,
  Tag,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type NavRole = "PHYSICIAN" | "NURSE_PRACTITIONER" | "ADMIN";
type NavItem = Readonly<{ href: Route; label: string; icon: LucideIcon }>;

/** Every role gets the same navigation pattern; only the sections differ. */
export function navigationFor(role: NavRole): readonly NavItem[] {
  if (role === "ADMIN")
    return [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/users", label: "Users", icon: Users },
      {
        href: "/admin/thresholds",
        label: "Thresholds",
        icon: SlidersHorizontal,
      },
      { href: "/admin/rules", label: "Rules", icon: ListChecks },
      { href: "/admin/keywords", label: "Keywords", icon: Tag },
      { href: "/admin/facilities", label: "Facilities", icon: Building2 },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/system", label: "System", icon: Server },
    ];
  return [
    { href: "/provider", label: "Dashboard", icon: LayoutDashboard },
    {
      href: "/provider/patient-list",
      label: "Patient list",
      icon: ClipboardList,
    },
    // Physician oversight of the NP caseload — see np-list/page.tsx.
    ...(role === "PHYSICIAN"
      ? [
          {
            href: "/provider/np-list" as Route,
            label: "NP list",
            icon: UserRound,
          },
        ]
      : []),
    { href: "/provider/reports", label: "Reports", icon: BarChart3 },
  ];
}

/** A section is active on its own page and on pages beneath it. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/admin" || href === "/provider") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({
  home,
  collapsed = false,
}: Readonly<{ home: Route; collapsed?: boolean }>) {
  return (
    <Link
      className="flex items-center gap-2.5 font-bold tracking-[-0.015em]"
      href={home}
      aria-label={collapsed ? "Smart Rounding home" : undefined}
    >
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-[10px] bg-gradient-to-br from-[#16816f] to-primary-strong text-sm font-bold text-white shadow-[0_4px_12px_rgba(13,107,93,0.17)]"
      >
        SR
      </span>
      {!collapsed && <span>Smart Rounding</span>}
    </Link>
  );
}

function NavLinks({
  items,
  collapsed = false,
}: Readonly<{ items: readonly NavItem[]; collapsed?: boolean }>) {
  const pathname = usePathname();
  return (
    <ul className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              // Collapsed: icon only; the name shows on hover and stays
              // available to screen readers.
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                collapsed && "justify-center px-0",
                active
                  ? "bg-secondary text-primary-strong"
                  : "text-muted-foreground hover:bg-muted hover:text-primary",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className={collapsed ? "sr-only" : undefined}>{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBlock({
  name,
  roleLabel,
  onSignOut,
  collapsed = false,
}: Readonly<{
  name: string;
  roleLabel: string;
  onSignOut: () => void;
  collapsed?: boolean;
}>) {
  return (
    <div className="border-t border-border pt-4">
      <div
        className={cn(
          "flex items-center gap-3 px-1",
          collapsed && "justify-center px-0",
        )}
        title={collapsed ? `${name} · ${roleLabel}` : undefined}
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#16816f] to-primary-strong text-[0.78rem] font-bold text-white"
        >
          {name.trim().slice(0, 2).toUpperCase()}
        </span>
        <span className={cn("flex min-w-0 flex-col", collapsed && "sr-only")}>
          <strong className="truncate text-sm">{name}</strong>
          <small className="text-[0.72rem] capitalize text-muted-foreground">
            {roleLabel}
          </small>
        </span>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        title={collapsed ? "Sign out" : undefined}
        className={cn(
          "mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-secondary",
          collapsed && "justify-center px-0",
        )}
      >
        <LogOut className="size-[18px]" aria-hidden="true" />
        <span className={collapsed ? "sr-only" : undefined}>Sign out</span>
      </button>
    </div>
  );
}

/**
 * Same navigation for every role: a fixed sidebar on large screens, and a
 * top bar with a menu button that opens the same list in a drawer below lg.
 */
export function AppNavigation({
  role,
  name,
  onSignOut,
  collapsed,
  onToggleCollapsed,
}: Readonly<{
  role: NavRole;
  name: string;
  onSignOut: () => void;
  /** Desktop sidebar shown as an icon rail. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
}>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = navigationFor(role);
  const home: Route = role === "ADMIN" ? "/admin" : "/provider";
  const roleLabel = role.replaceAll("_", " ").toLowerCase();

  // Close the drawer once a link has navigated.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <aside
        aria-label="Primary navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-card py-5 transition-[width] duration-200 lg:flex",
          collapsed ? "w-[4.5rem] px-3" : "w-64 px-4",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed ? "flex-col" : "justify-between px-1",
          )}
        >
          <Brand home={home} collapsed={collapsed} />
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
            className="grid size-9 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-[18px]" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-[18px]" aria-hidden="true" />
            )}
          </button>
        </div>
        <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Sections">
          <NavLinks items={items} collapsed={collapsed} />
        </nav>
        <UserBlock
          name={name}
          roleLabel={roleLabel}
          onSignOut={onSignOut}
          collapsed={collapsed}
        />
      </aside>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-2.5 shadow-sm lg:hidden">
          <DialogPrimitive.Trigger
            aria-label="Open menu"
            className="grid size-10 place-items-center rounded-lg border border-border text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Menu className="size-5" aria-hidden="true" />
          </DialogPrimitive.Trigger>
          <Brand home={home} />
        </header>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/45 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-card px-4 py-5 shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden">
            <div className="flex items-center justify-between px-1">
              <DialogPrimitive.Title asChild>
                <div>
                  <Brand home={home} />
                </div>
              </DialogPrimitive.Title>
              <DialogPrimitive.Close
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-lg border border-border text-muted-foreground outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <X className="size-4" aria-hidden="true" />
              </DialogPrimitive.Close>
            </div>
            <DialogPrimitive.Description className="sr-only">
              Main navigation
            </DialogPrimitive.Description>
            <nav className="mt-7 flex-1 overflow-y-auto" aria-label="Sections">
              <NavLinks items={items} />
            </nav>
            <UserBlock
              name={name}
              roleLabel={roleLabel}
              onSignOut={onSignOut}
            />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
