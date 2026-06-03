import * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/DataTable";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Skeleton } from "@/components/feedback/Skeleton";
import { StatusBadge } from "@/components/feedback/StatusBadge";
import { Toast } from "@/components/feedback/Toast";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
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
  uploadBrandImage,
  type ApiFailure,
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
import { BrandImageMark } from "./BrandImageMark";
import { BrandMembershipTable } from "./BrandMembershipTable";
import { InputBox } from "@/components/ui/InputBox";

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

function brandActionErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    typeof (error as ApiFailure).code !== "string"
  ) {
    return fallback;
  }

  const failure = error as ApiFailure;
  const reason =
    typeof failure.details === "object" &&
    failure.details !== null &&
    "reason" in failure.details &&
    typeof (failure.details as { reason?: unknown }).reason === "string"
      ? String((failure.details as { reason: string }).reason)
      : null;

  if (failure.code === "AUTH_FORBIDDEN") {
    return "You don't have access to do that for this brand.";
  }

  if (failure.code === "CONFLICT_STATE") {
    if (reason === "DUPLICATE_PENDING_INVITATION") {
      return "This admin already has a pending invite.";
    }

    if (reason === "DUPLICATE_ACTIVE_MEMBERSHIP") {
      return "This admin is already part of this brand.";
    }

    if (reason === "DUPLICATE_PENDING_REQUEST") {
      return "This admin already asked to join this brand.";
    }
  }

  if (failure.code === "PROVIDER_UNAVAILABLE") {
    return "We couldn't complete that right now. Try again soon.";
  }

  return typeof failure.message === "string" &&
    failure.message.trim().length > 0
    ? failure.message
    : fallback;
}

export function resolveBrandActionPermissions(input: {
  actor: AuthenticatedActor | null;
  members: BrandMembershipRecord[];
  membersUnavailable: boolean;
}): BrandActionPermissions {
  if (!input.actor) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "Sign in as an admin to manage this brand.",
    };
  }

  if (input.actor.role === "SUPER_ADMIN") {
    return {
      canApproveJoinRequests: true,
      canArchiveBrand: true,
      canInviteMembers: true,
      reason: "You can manage this brand.",
    };
  }

  if (input.membersUnavailable) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason:
        "We couldn't confirm your access right now. Refresh and try again.",
    };
  }

  const actorMembership = input.members.find(
    (member) => member.adminId === input.actor?.id && member.status === "ACTIVE"
  );

  if (!actorMembership) {
    return {
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "You need to join this brand before you can manage it.",
    };
  }

  return {
    canApproveJoinRequests: true,
    canArchiveBrand: true,
    canInviteMembers: true,
    reason: "You can manage this brand.",
  };
}

async function loadCollection<T>(
  loader: () => Promise<T[]>
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

export function BrandDetailHeader({ brand }: { brand: BrandRecord }) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-grid-md border-b border-brand-border-strong py-grid-md pt-grid-lg max-md:grid-cols-1 max-md:items-stretch max-md:pt-grid-md">
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-grid-sm max-sm:grid-cols-1">
        <BrandImageMark
          imageAlt={brand.imageAlt}
          imageSrc={brand.imageSrc}
          name={brand.name}
          size="lg"
        />
        <div className="min-w-0">
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Catalog collaboration
          </p>
          <h1 className="text-[clamp(1.8rem,6vw,3.8rem)]">{brand.name}</h1>
          <p className="max-w-[72ch] text-[0.9375rem] text-brand-muted">
            Manage people, invites, join requests, and linked products for this
            brand.
          </p>
        </div>
      </div>
      <div className="grid justify-items-end gap-grid-xs max-md:justify-items-start">
        <ButtonLink href="/admin/brands" size="sm" textSize="xs">
          Back to brands
        </ButtonLink>
        <StatusBadge label={brand.status} tone={statusTone(brand.status)} />
        <p className="text-xs text-brand-muted">
          Updated {formatDateTime(brand.updatedAt)}
        </p>
      </div>
    </header>
  );
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
  const [brandImageFile, setBrandImageFile] = useState<File | null>(null);
  const [brandImageAlt, setBrandImageAlt] = useState("");
  const [actionToast, setActionToast] = useState<ToastState | null>(null);
  const [pendingJoinAdminId, setPendingJoinAdminId] = useState<string | null>(
    null
  );
  const [sendingInvite, setSendingInvite] = useState(false);
  const [uploadingBrandImage, setUploadingBrandImage] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [copyViolations, setCopyViolations] = useState<string[]>([]);

  const permissions = useMemo(
    () =>
      resolveBrandActionPermissions({
        actor,
        members: members.items,
        membersUnavailable: members.unavailable,
      }),
    [actor, members.items, members.unavailable]
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
    []
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
      .then(
        ([
          nextActor,
          nextBrand,
          nextProducts,
          nextMembers,
          nextInvites,
          nextJoinRequests,
        ]) => {
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
        }
      )
      .catch(() => {
        if (!active) return;
        setLoadState("failed");
      });

    return () => {
      active = false;
    };
  }, [brandId]);

  async function handleInviteSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    if (!brand) return;

    const email = inviteEmail.trim();
    if (!email) {
      setActionToast({
        tone: "warning",
        title: "Invite email required",
        message: "Enter an admin email before sending this invite.",
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
        message: "This admin now has a pending invite.",
      });
    } catch (error) {
      setActionToast({
        tone: "error",
        title: "Invite failed",
        message: brandActionErrorMessage(
          error,
          "We couldn't send the invite right now."
        ),
      });
    } finally {
      setSendingInvite(false);
    }
  }

  async function handleBrandImageSubmit(
    event: React.SyntheticEvent<HTMLFormElement, SubmitEvent>
  ) {
    event.preventDefault();
    if (!brand || !brandImageFile) {
      setActionToast({
        tone: "warning",
        title: "Brand image required",
        message: "Choose an image before uploading.",
      });
      return;
    }

    setUploadingBrandImage(true);
    try {
      const updated = await uploadBrandImage(brand.id, {
        image: brandImageFile,
        name: brandImageAlt.trim().length > 0 ? brandImageAlt : brand.name,
      });
      setBrand(updated);
      setBrandImageFile(null);
      setBrandImageAlt("");
      setActionToast({
        tone: "success",
        title: "Image uploaded",
        message: "Brand image is now visible in brand cards and detail.",
      });
    } catch (error) {
      setActionToast({
        tone: "error",
        title: "Image upload failed",
        message: brandActionErrorMessage(
          error,
          "We couldn't upload this brand image right now."
        ),
      });
    } finally {
      setUploadingBrandImage(false);
    }
  }

  async function handleJoinDecision(
    action: "approve" | "reject",
    adminId: string
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
            ? "This admin can now access this brand."
            : "This join request was declined.",
      });
    } catch (error) {
      setActionToast({
        tone: "error",
        title: "Action failed",
        message: brandActionErrorMessage(
          error,
          "We couldn't update this request right now."
        ),
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
        message: "This brand is now archived.",
      });
    } catch (error) {
      setActionToast({
        tone: "error",
        title: "Archive failed",
        message: brandActionErrorMessage(
          error,
          "We couldn't archive this brand right now."
        ),
      });
    } finally {
      setArchiving(false);
    }
  }

  if (loadState === "loading") {
    return (
      <main className="mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm">
        <section className="grid gap-grid-sm py-grid-md">
          <Skeleton lines={6} label="Loading brand detail" />
        </section>
      </main>
    );
  }

  if (loadState === "failed" || !brand) {
    return (
      <main className="mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm">
        <section className="grid gap-grid-sm py-grid-md">
          <EmptyState
            title="Brand detail unavailable"
            message="We couldn't load this brand right now."
          />
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1240px] p-grid-md max-md:p-grid-sm">
      <BrandDetailHeader brand={brand} />

      <section className="grid gap-grid-sm py-grid-md">
        <div className="grid gap-grid-sm border border-brand-border-strong bg-brand-surface p-grid-sm">
          <p className="font-system text-xs font-bold uppercase text-brand-muted">
            Brand actions
          </p>
          <form
            className="grid grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] items-end gap-grid-xs max-md:grid-cols-1"
            onSubmit={handleBrandImageSubmit}
          >
            <InputBox
              accept="image/jpeg,image/png,image/webp"
              description="Upload JPEG, PNG, or WEBP up to 5MB."
              disabled={!permissions.canInviteMembers || uploadingBrandImage}
              label="Brand image"
              onChange={(event) =>
                setBrandImageFile(event.currentTarget.files?.item(0) ?? null)
              }
              type="file"
            />
            <InputBox
              disabled={!permissions.canInviteMembers || uploadingBrandImage}
              label="Image alt text"
              onChange={(event) => setBrandImageAlt(event.currentTarget.value)}
              placeholder={brand.name}
              value={brandImageAlt}
            />
            <Button
              disabled={
                !permissions.canInviteMembers ||
                !brandImageFile ||
                uploadingBrandImage
              }
              loading={uploadingBrandImage}
              loadingLabel="Uploading"
              type="submit"
              variant="secondary"
            >
              Upload image
            </Button>
          </form>
          <form
            className="grid grid-cols-[minmax(260px,1fr)_auto_auto] items-end gap-grid-xs max-md:grid-cols-1"
            onSubmit={handleInviteSubmit}
          >
            <InputBox
              description="Invite an admin to join this brand by email."
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
          <p className="text-xs text-brand-muted">{permissions.reason}</p>
        </div>
      </section>

      <section className="grid gap-grid-sm py-grid-md">
        <Tabs
          defaultValue="members"
          label="Brand detail sections"
          tabs={[
            {
              id: "members",
              label: "Brand members",
              content: members.unavailable ? (
                <EmptyState
                  title="Couldn't load members"
                  message="We couldn't load the member list right now. Refresh and try again."
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
                  title="Couldn't load invites"
                  message="We couldn't load invites right now. Refresh and try again."
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
                  title="Couldn't load join requests"
                  message="We couldn't load join requests right now. Refresh and try again."
                />
              ) : (
                <BrandJoinRequestTable
                  canManageJoinRequests={permissions.canApproveJoinRequests}
                  onApprove={(adminId) =>
                    handleJoinDecision("approve", adminId)
                  }
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
                  message="We couldn't load linked products right now."
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
        <section className="grid gap-grid-sm py-grid-md">
          <EmptyState
            title="Language guardrails flagged"
            message={
              <ul className="m-0 pl-grid-sm">
                {copyViolations.map((violation) => (
                  <li key={violation}>{violation}</li>
                ))}
              </ul>
            }
          />
        </section>
      ) : null}

      {actionToast ? (
        <div className="fixed bottom-grid-md right-grid-md z-[60] max-md:bottom-grid-sm max-md:left-grid-sm max-md:right-grid-sm">
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
        message="Archive this brand. Past product history stays in place, but no one can keep working in it."
        onCancel={() => setArchiveDialogOpen(false)}
        onConfirm={handleArchiveConfirm}
        open={archiveDialogOpen}
        title="Confirm archive"
        tone="danger"
      />
    </main>
  );
}
