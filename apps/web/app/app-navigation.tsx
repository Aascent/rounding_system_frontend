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

/**
 * Sidebar geometry: every row keeps its icon at the same x position in both
 * states, so collapsing only animates the width and fades the text. Nothing
 * re-flows mid-animation (which is what made it jerk).
 */
const ROW =
  "flex h-10 w-full items-center rounded-lg pl-[15px] text-sm font-semibold outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50";
const fade = (collapsed: boolean) =>
  cn(
    "ml-3 truncate whitespace-nowrap transition-opacity duration-200",
    collapsed && "pointer-events-none opacity-0",
  );

function Brand({
  home,
  collapsed = false,
}: Readonly<{ home: Route; collapsed?: boolean }>) {
  return (
    <Link
      className="flex h-10 items-center rounded-lg pl-1.5 font-bold tracking-[-0.015em] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      href={home}
      title={collapsed ? "Smart Rounding" : undefined}
    >
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-gradient-to-br from-[#16816f] to-primary-strong text-sm font-bold text-white shadow-[0_4px_12px_rgba(13,107,93,0.17)]"
      >
        SR
      </span>
      <span className={cn(fade(collapsed), "ml-2.5")}>Smart Rounding</span>
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
              // The label stays in the DOM (faded) so it is still the
              // accessible name; the title adds a hover hint when collapsed.
              title={collapsed ? label : undefined}
              className={cn(
                ROW,
                active
                  ? "bg-secondary text-primary-strong"
                  : "text-muted-foreground hover:bg-muted hover:text-primary",
              )}
            >
              <Icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className={fade(collapsed)}>{label}</span>
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
    <div className="grid gap-1">
      <div
        className="flex h-12 items-center pl-1.5"
        title={collapsed ? `${name} · ${roleLabel}` : undefined}
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#16816f] to-primary-strong text-[0.75rem] font-bold text-white"
        >
          {name.trim().slice(0, 2).toUpperCase()}
        </span>
        <span className={cn(fade(collapsed), "ml-2.5 flex min-w-0 flex-col")}>
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
        className={cn(ROW, "text-primary hover:bg-secondary")}
      >
        <LogOut className="size-[18px] shrink-0" aria-hidden="true" />
        <span className={fade(collapsed)}>Sign out</span>
      </button>
    </div>
  );
}

/**
 * Same navigation for every role: a fixed sidebar on large screens (which
 * collapses to an icon rail), and a top bar with a menu button that opens
 * the same list in a drawer below lg.
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
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-x-hidden border-r border-border bg-card px-3 py-4 transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        <Brand home={home} collapsed={collapsed} />
        <nav
          className="mt-6 flex-1 overflow-y-auto overflow-x-hidden"
          aria-label="Sections"
        >
          <NavLinks items={items} collapsed={collapsed} />
        </nav>
        <div className="grid gap-1 border-t border-border pt-3">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
            className={cn(
              ROW,
              "text-muted-foreground hover:bg-muted hover:text-primary",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen
                className="size-[18px] shrink-0"
                aria-hidden="true"
              />
            ) : (
              <PanelLeftClose
                className="size-[18px] shrink-0"
                aria-hidden="true"
              />
            )}
            <span className={fade(collapsed)}>
              {collapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
          <UserBlock
            name={name}
            roleLabel={roleLabel}
            onSignOut={onSignOut}
            collapsed={collapsed}
          />
        </div>
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
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-card px-3 py-4 shadow-xl outline-none data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:animate-in data-[state=open]:slide-in-from-left lg:hidden">
            <div className="flex items-center justify-between">
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
            <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Sections">
              <NavLinks items={items} />
            </nav>
            <div className="border-t border-border pt-3">
              <UserBlock
                name={name}
                roleLabel={roleLabel}
                onSignOut={onSignOut}
              />
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
