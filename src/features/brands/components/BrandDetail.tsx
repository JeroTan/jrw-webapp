import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data-display/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Input";
import { Tabs } from "@/components/ui/Tabs";
import {
  approveJoinRequest,
  archiveBrand,
  fetchBrandDetail,
  fetchBrandInvites,
  fetchBrandJoinRequests,
  fetchBrandMembers,
  fetchBrandProducts,
  fetchSessionActor,
  inviteBrandMember,
  isNotFoundFailure,
  rejectJoinRequest,
} from "../api";
import { validateBrandCopy } from "../language";
import type {
  AuthenticatedActor,
  BrandActionPermissions,
  BrandInviteRecord,
  BrandJoinRequestRecord,
  BrandMembershipRecord,
  BrandProductRecord,
  BrandRecord,
} from "../types";
import { BrandInviteTable } from "./BrandInviteTable";
import { BrandJoinRequestTable } from "./BrandJoinRequestTable";
import { BrandMembershipTable } from "./BrandMembershipTable";

type LoadState = "loading" | "ready" | "failed";

type CollectionState<T> = {
  items: T[];
  unavailable: boolean;
};

type ToastState = {
  message: string;
  title: string;
  tone: "error" | "success" | "warning";
};

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function emptyCollection<T>(): CollectionState<T> {
  return { items: [], unavailable: false };
}

function unavailableCollection<T>(): CollectionState<T> {
  return { items: [], unavailable: true };
}

function statusTone(status: BrandRecord["status"]) {
  return status === "ACTIVE" ? ("success" as const) : ("warning" as const);
}

function resolvePermissions(input: {
  actor: AuthenticatedActor | null;
  members: BrandMembershipRecord[];
  membersUnavailable: boolean;
}): BrandActionPermissions {
  if (!input.actor) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "Admin session required.",
    };
  }

  if (input.actor.role === "SUPER_ADMIN") {
    return {
      canApproveJoinRequests: true,
      canArchiveBrand: true,
      canInviteMembers: true,
      reason: "Allowed by super admin role.",
    };
  }

  if (input.membersUnavailable) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "Membership API unavailable. Verify permissions from server response.",
    };
  }

  const actorMembership = input.members.find(
    (member) => member.adminId === input.actor?.id && member.status === "ACTIVE",
  );

  if (!actorMembership) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "Active brand membership required.",
    };
  }

  if (actorMembership.role === "OWNER") {
    return {
      canApproveJoinRequests: true,
      canArchiveBrand: true,
      canInviteMembers: true,
      reason: "Allowed for owner membership.",
    };
  }

  return {
    canApproveJoinRequests: false,
    canArchiveBrand: false,
    canInviteMembers: false,
    reason: "Owner membership required for this action.",
  };
}

async function loadCollection<T>(
  loader: () => Promise<T[]>,
): Promise<CollectionState<T>> {
  try {
    const items = await loader();
    return { items, unavailable: false };
  } catch (error) {
    if (isNotFoundFailure(error)) {
      return unavailableCollection<T>();
    }

    return unavailableCollection<T>();
  }
}

export function BrandDetail({ brandId }: { brandId: string }) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [brand, setBrand] = useState<BrandRecord | null>(null);
  const [actor, setActor] = useState<AuthenticatedActor | null>(null);
  const [members, setMembers] =
    useState<CollectionState<BrandMembershipRecord>>(emptyCollection());
  const [invites, setInvites] =
    useState<CollectionState<BrandInviteRecord>>(emptyCollection());
  const [joinRequests, setJoinRequests] =
    useState<CollectionState<BrandJoinRequestRecord>>(emptyCollection());
  const [products, setProducts] =
    useState<CollectionState<BrandProductRecord>>(emptyCollection());
  const [inviteEmail, setInviteEmail] = useState("");
  const [actionToast, setActionToast] = useState<ToastState | null>(null);
  const [pendingJoinAdminId, setPendingJoinAdminId] = useState<string | null>(null);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [copyViolations, setCopyViolations] = useState<string[]>([]);

  const permissions = useMemo(
    () =>
      resolvePermissions({
        actor,
        members: members.items,
        membersUnavailable: members.unavailable,
      }),
    [actor, members.items, members.unavailable],
  );

  const productColumns = useMemo<Array<DataTableColumn<BrandProductRecord>>>(
    () => [
      {
        key: "name",
        header: "Product",
        cell: (row) => row.name,
      },
      {
        key: "description",
        header: "Description",
        cell: (row) => row.description,
      },
      {
        key: "updatedAt",
        header: "Updated",
        cell: (row) => formatDateTime(row.updatedAt),
      },
    ],
    [],
  );

  async function refreshMembershipTables(targetBrandId: string) {
    const [nextMembers, nextInvites, nextJoinRequests] = await Promise.all([
      loadCollection(() => fetchBrandMembers(targetBrandId)),
      loadCollection(() => fetchBrandInvites(targetBrandId)),
      loadCollection(() => fetchBrandJoinRequests(targetBrandId)),
    ]);

    setMembers(nextMembers);
    setInvites(nextInvites);
    setJoinRequests(nextJoinRequests);
  }

  useEffect(() => {
    let active = true;
    setLoadState("loading");

    Promise.all([
      fetchSessionActor(),
      fetchBrandDetail(brandId),
      fetchBrandProducts(brandId),
      loadCollection(() => fetchBrandMembers(brandId)),
      loadCollection(() => fetchBrandInvites(brandId)),
      loadCollection(() => fetchBrandJoinRequests(brandId)),
    ])
      .then(([nextActor, nextBrand, nextProducts, nextMembers, nextInvites, nextJoinRequests]) => {
        if (!active) return;

        setActor(nextActor);
        setBrand(nextBrand);
        setProducts({
          items: nextProducts.items,
          unavailable: false,
        });
        setMembers(nextMembers);
        setInvites(nextInvites);
        setJoinRequests(nextJoinRequests);
        setLoadState("ready");

        const violationSource = [
          "Brand detail",
          "brand members",
          "catalog group",
          "Join requests",
          "Invites",
        ].join(" ");
        setCopyViolations(validateBrandCopy(violationSource, "BrandDetail"));
      })
      .catch(() => {
        if (!active) return;
        setLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, [brandId]);

  async function handleInviteSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) {
    event.preventDefault();
    if (!brand) return;

    const email = inviteEmail.trim();
    if (!email) {
      setActionToast({
        tone: "warning",
        title: "Invite email required",
        message: "Provide admin email before sending invite.",
      });
      return;
    }

    setSendingInvite(true);
    try {
      await inviteBrandMember({ brandId: brand.id, email });
      await refreshMembershipTables(brand.id);
      setInviteEmail("");
      setActionToast({
        tone: "success",
        title: "Invite sent",
        message: "Brand invitation created.",
      });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Invite failed.";
      setActionToast({
        tone: "error",
        title: "Invite failed",
        message,
      });
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleJoinDecision(
    action: "approve" | "reject",
    adminId: string,
  ) {
    if (!brand) return;

    setPendingJoinAdminId(adminId);
    try {
      if (action === "approve") {
        await approveJoinRequest(brand.id, adminId);
      } else {
        await rejectJoinRequest(brand.id, adminId);
      }

      await refreshMembershipTables(brand.id);
      setActionToast({
        tone: "success",
        title: action === "approve" ? "Join approved" : "Join rejected",
        message:
          action === "approve"
            ? "Brand member activated."
            : "Join request rejected.",
      });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Join decision failed.";
      setActionToast({
        tone: "error",
        title: "Action failed",
        message,
      });
    } finally {
      setPendingJoinAdminId(null);
    }
  }

  async function handleArchiveConfirm() {
    if (!brand) return;

    setArchiving(true);
    try {
      const updated = await archiveBrand(brand.id);
      setBrand(updated);
      setArchiveDialogOpen(false);
      setActionToast({
        tone: "warning",
        title: "Brand archived",
        message: "Catalog group archived. Historical references remain intact.",
      });
    } catch (error) {
      const message =
        typeof error === "object" && error !== null && "message" in error
          ? String(error.message)
          : "Archive failed.";
      setActionToast({
        tone: "error",
        title: "Archive failed",
        message,
      });
    } finally {
      setArchiving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <main className="jrw-brands">
        <section className="jrw-brands__section">
          <Skeleton lines={6} label="Loading brand detail" />
        </section>
      </main>
    );
  }

  if (loadState === "failed" || !brand) {
    return (
      <main className="jrw-brands">
        <section className="jrw-brands__section">
          <EmptyState
            title="Brand detail unavailable"
            message="Could not load brand detail for this catalog group."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="jrw-brands">
      <header className="jrw-brands__header">
        <div>
          <p className="jrw-page-kicker">Catalog collaboration</p>
          <h1 className="jrw-brands__title">{brand.name}</h1>
          <p className="jrw-page-copy">
            Manage this brand's members, invitations, join requests, and linked products.
          </p>
        </div>
        <div className="jrw-brands__summary">
          <StatusBadge label={brand.status} tone={statusTone(brand.status)} />
          <p className="jrw-brands__cell-meta">Updated {formatDateTime(brand.updatedAt)}</p>
        </div>
      </header>

      <section className="jrw-brands__section">
        <div className="jrw-brands__panel">
          <p className="jrw-page-kicker">Brand actions</p>
          <form className="jrw-brands__actions" onSubmit={handleInviteSubmit}>
            <Input
              description="Invite admin by email as brand member."
              disabled={!permissions.canInviteMembers || sendingInvite}
              label="Invite admin email"
              onChange={(event) => setInviteEmail(event.currentTarget.value)}
              placeholder="admin@example.com"
              type="email"
              value={inviteEmail}
            />
            <Button
              disabled={!permissions.canInviteMembers || sendingInvite}
              loading={sendingInvite}
              loadingLabel="Inviting"
              type="submit"
              variant="primary"
            >
              Send invite
            </Button>
            <Button
              disabled={!permissions.canArchiveBrand || archiving}
              loading={archiving}
              loadingLabel="Archiving"
              onClick={() => setArchiveDialogOpen(true)}
              variant="danger"
            >
              Archive brand
            </Button>
          </form>
          <p className="jrw-brands__action-note">{permissions.reason}</p>
        </div>
      </section>

      <section className="jrw-brands__section">
        <Tabs
          defaultValue="members"
          label="Brand detail sections"
          tabs={[
            {
              id: "members",
              label: "Brand members",
              content: members.unavailable ? (
                <EmptyState
                  title="Members unavailable"
                  message="Members API route not available. Server authorization remains source of truth."
                />
              ) : (
                <BrandMembershipTable
                  permissionReason={permissions.reason}
                  rows={members.items}
                />
              ),
            },
            {
              id: "invites",
              label: "Invites",
              content: invites.unavailable ? (
                <EmptyState
                  title="Invites unavailable"
                  message="Invite listing route not available. Send invite action still enforced by server."
                />
              ) : (
                <BrandInviteTable
                  canManageInvites={permissions.canInviteMembers}
                  permissionReason={permissions.reason}
                  rows={invites.items}
                />
              ),
            },
            {
              id: "join-requests",
              label: "Join requests",
              content: joinRequests.unavailable ? (
                <EmptyState
                  title="Join requests unavailable"
                  message="Join request listing route not available. Approve/reject guard still enforced by server."
                />
              ) : (
                <BrandJoinRequestTable
                  canManageJoinRequests={permissions.canApproveJoinRequests}
                  onApprove={(adminId) => handleJoinDecision("approve", adminId)}
                  onReject={(adminId) => handleJoinDecision("reject", adminId)}
                  pendingAdminId={pendingJoinAdminId}
                  permissionReason={permissions.reason}
                  rows={joinRequests.items}
                />
              ),
            },
            {
              id: "products",
              label: "Brand products",
              content: products.unavailable ? (
                <EmptyState
                  title="Products unavailable"
                  message="Brand products could not load."
                />
              ) : (
                <DataTable
                  caption="Brand-scoped products"
                  columns={productColumns}
                  emptyMessage="No products assigned to this brand."
                  getRowId={(row) => row.id}
                  rows={products.items}
                />
              ),
            },
          ]}
        />
      </section>

      {copyViolations.length > 0 ? (
        <section className="jrw-brands__section">
          <EmptyState
            title="Language guardrails flagged"
            message={
              <ul className="jrw-brands__violations">
                {copyViolations.map((violation) => (
                  <li key={violation}>{violation}</li>
                ))}
              </ul>
            }
          />
        </section>
      ) : null}

      {actionToast ? (
        <div className="jrw-brands__toast">
          <Toast
            message={actionToast.message}
            onDismiss={() => setActionToast(null)}
            title={actionToast.title}
            tone={actionToast.tone}
          />
        </div>
      ) : null}

      <ConfirmDialog
        confirmLabel="Archive brand"
        message="Archive this catalog group. Product history references remain, but active collaboration stops."
        onCancel={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        open={archiveDialogOpen}
        title="Confirm archive"
        tone="danger"
      />
    </main>
  );
}
