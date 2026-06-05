import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandInviteTable } from "./BrandInviteTable";
import { BrandJoinRequestTable } from "./BrandJoinRequestTable";
import {
  BrandDetailHeader,
  resolveBrandActionPermissions,
} from "./BrandDetail";
import {
  BrandList,
  filterBrandsByQuery,
  readBrandResourceViewMode,
  writeBrandResourceViewMode,
} from "./BrandList";
import { BrandMembershipTable } from "./BrandMembershipTable";
import { ProductBrandField } from "./ProductBrandField";
import {
  BrandEditor,
  brandImagePreviewAlt,
  suggestedBrandSlug,
} from "./BrandEditor";
import { BrandImageMark, brandInitials } from "./BrandImageMark";

const now = "2026-05-18T06:30:00.000Z";

describe("brands UI surfaces", () => {
  it("filters brand resources by name or slug", () => {
    const brands = [
      {
        id: "brand_1",
        name: "JRW Studio",
        slug: "jrw-studio",
        description: null,
        status: "ACTIVE" as const,
        archivedAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "brand_2",
        name: "North Workshop",
        slug: "north-workshop",
        description: null,
        status: "ARCHIVED" as const,
        archivedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];

    expect(filterBrandsByQuery(brands, " studio ")).toHaveLength(1);
    expect(filterBrandsByQuery(brands, "north-workshop")).toHaveLength(1);
    expect(filterBrandsByQuery(brands, "missing")).toHaveLength(0);
    expect(filterBrandsByQuery(brands, "")).toHaveLength(2);
  });

  it("persists brand resource view mode in session storage", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };

    expect(readBrandResourceViewMode(storage)).toBe("cards");

    writeBrandResourceViewMode("list", storage);
    expect(readBrandResourceViewMode(storage)).toBe("list");

    storage.setItem("jrw.brandResourceViewMode", "invalid");
    expect(readBrandResourceViewMode(storage)).toBe("cards");
  });

  it("describes the brand list page by what admins can manage", () => {
    const markup = renderToStaticMarkup(createElement(BrandList));

    expect(markup).toContain("You can manage your list of brands here.");
    expect(markup).toContain("Search brands");
    expect(markup).toContain("Create brand");
    expect(markup).toContain("Brand view");
    expect(markup).toContain("Cards");
    expect(markup).toContain("List");
    expect(markup).toContain("Loading brand cards");
    expect(markup).toContain("Loading brand card 1");
    expect(markup.indexOf("Brand view")).toBeLessThan(
      markup.indexOf("Create brand")
    );
    expect(markup).not.toContain(
      "Brands are optional catalog groups. JRW remains seller of record."
    );
  });

  it("renders brand editor for create flow", () => {
    const markup = renderToStaticMarkup(
      createElement(BrandEditor, {
        open: true,
        onClose: () => undefined,
        onSave: async () => undefined,
      })
    );

    expect(markup).toContain("Create brand");
    expect(markup).toContain("Brand name");
    expect(markup).toContain("Slug");
    expect(markup).toContain("Description");
    expect(markup).toContain("Brand image");
    expect(markup).toContain("Image alt text");
  });

  it("renders brand detail return action", () => {
    const markup = renderToStaticMarkup(
      createElement(BrandDetailHeader, {
        brand: {
          id: "brand_1",
          name: "JRW Studio",
          slug: "jrw-studio",
          description: null,
          status: "ACTIVE",
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
        },
      })
    );

    expect(markup).toContain("Back to brands");
    expect(markup).toContain('href="/admin/brands"');
    expect(markup).toContain('aria-label="JRW Studio brand image placeholder"');
    expect(markup).toContain("JRW Studio");
  });

  it("renders brand image placeholder initials when no image exists", () => {
    const markup = renderToStaticMarkup(
      createElement(BrandImageMark, { name: "North Workshop" })
    );

    expect(brandInitials("North Workshop")).toBe("NW");
    expect(markup).toContain('role="img"');
    expect(markup).toContain("North Workshop brand image placeholder");
    expect(markup).toContain("NW");
  });

  it("renders saved brand image when image exists", () => {
    const markup = renderToStaticMarkup(
      createElement(BrandImageMark, {
        imageAlt: "JRW Studio mark",
        imageSrc: "/assets/brands/brand_1/image.jpg",
        name: "JRW Studio",
      })
    );

    expect(markup).toContain("<img");
    expect(markup).toContain('alt="JRW Studio mark"');
    expect(markup).toContain('src="/assets/brands/brand_1/image.jpg"');
  });

  it("suggests editable brand slugs from names", () => {
    expect(suggestedBrandSlug(" JRW Studio / Gifts ")).toBe("jrw-studio-gifts");
    expect(suggestedBrandSlug("")).toBe("");
  });

  it("builds accessible alt text for selected brand image previews", () => {
    expect(
      brandImagePreviewAlt({
        brandName: "JRW Studio",
        imageAlt: "Studio mark",
      })
    ).toBe("Studio mark");
    expect(
      brandImagePreviewAlt({
        brandName: "JRW Studio",
        imageAlt: " ",
      })
    ).toBe("JRW Studio brand image preview");
    expect(
      brandImagePreviewAlt({
        brandName: " ",
        imageAlt: " ",
      })
    ).toBe("Selected brand image preview");
  });

  it("renders product brand helper text and brandless option", () => {
    const markup = renderToStaticMarkup(
      createElement(ProductBrandField, {
        autoLoadBrands: false,
        brands: [
          {
            id: "brand_1",
            name: "JRW Studio",
            slug: "jrw-studio",
            description: null,
            status: "ACTIVE",
            archivedAt: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
        onChange: () => undefined,
        value: null,
      })
    );

    expect(markup).toContain("No brand (brandless)");
    expect(markup).toContain("belongs in a catalog group");
    expect(markup).toContain("No brand is valid");
    expect(markup).not.toContain("missing seller or store");
    expect(markup).not.toContain("seller of record");
  });

  it("allows active brand member admins to manage brand invitations and requests", () => {
    const permissions = resolveBrandActionPermissions({
      actor: {
        id: "admin_member",
        role: "ADMIN",
        accountStatus: {
          approved: true,
          emailVerified: true,
          status: "ACTIVE",
        },
      },
      members: [
        {
          id: "membership_1",
          brandId: "brand_1",
          adminId: "admin_member",
          adminEmail: "member@example.test",
          role: "MEMBER",
          status: "ACTIVE",
          invitedByAdminId: "admin_owner",
          createdAt: now,
          updatedAt: now,
        },
      ],
      membersUnavailable: false,
    });

    expect(permissions).toMatchObject({
      canApproveJoinRequests: true,
      canArchiveBrand: true,
      canInviteMembers: true,
      reason: "You can manage this brand.",
    });
  });

  it("keeps brand actions blocked for non-members", () => {
    const permissions = resolveBrandActionPermissions({
      actor: {
        id: "admin_outside",
        role: "ADMIN",
        accountStatus: {
          approved: true,
          emailVerified: true,
          status: "ACTIVE",
        },
      },
      members: [
        {
          id: "membership_1",
          brandId: "brand_1",
          adminId: "admin_member",
          adminEmail: "member@example.test",
          role: "MEMBER",
          status: "ACTIVE",
          invitedByAdminId: "admin_owner",
          createdAt: now,
          updatedAt: now,
        },
      ],
      membersUnavailable: false,
    });

    expect(permissions).toMatchObject({
      canApproveJoinRequests: false,
      canArchiveBrand: false,
      canInviteMembers: false,
      reason: "You need to join this brand before you can manage it.",
    });
  });

  it("renders text-labeled membership statuses in table", () => {
    const markup = renderToStaticMarkup(
      createElement(BrandMembershipTable, {
        rows: [
          {
            id: "membership_1",
            brandId: "brand_1",
            adminId: "admin_1",
            adminEmail: "admin1@example.test",
            role: "OWNER",
            status: "ACTIVE",
            invitedByAdminId: null,
            createdAt: now,
            updatedAt: now,
          },
          {
            id: "membership_2",
            brandId: "brand_1",
            adminId: "admin_2",
            adminEmail: "admin2@example.test",
            role: "MEMBER",
            status: "PENDING",
            invitedByAdminId: "admin_1",
            createdAt: now,
            updatedAt: now,
          },
        ],
      })
    );

    expect(markup).toContain("ACTIVE");
    expect(markup).toContain("PENDING");
    expect(markup).toContain("border-brand-success");
    expect(markup).toContain("border-brand-warning");
  });

  it("shows invite and join request tables with explicit status text", () => {
    const inviteMarkup = renderToStaticMarkup(
      createElement(BrandInviteTable, {
        canManageInvites: false,
        rows: [
          {
            id: "invite_1",
            brandId: "brand_1",
            adminId: "admin_2",
            adminEmail: "admin2@example.test",
            role: "MEMBER",
            status: "PENDING",
            invitedByAdminId: "admin_1",
            invitedByLabel: "owner@example.test",
            createdAt: now,
            updatedAt: now,
          },
        ],
      })
    );

    const joinMarkup = renderToStaticMarkup(
      createElement(BrandJoinRequestTable, {
        canManageJoinRequests: true,
        onApprove: () => undefined,
        onReject: () => undefined,
        rows: [
          {
            id: "join_1",
            brandId: "brand_1",
            adminId: "admin_3",
            adminEmail: "admin3@example.test",
            role: "MEMBER",
            status: "PENDING",
            invitedByAdminId: null,
            createdAt: now,
            updatedAt: now,
          },
        ],
      })
    );

    expect(inviteMarkup).toContain("PENDING");
    expect(inviteMarkup).toContain(
      "You need access to manage invites for this brand."
    );
    expect(joinMarkup).toContain("Approve");
    expect(joinMarkup).toContain("Reject");
    expect(inviteMarkup).not.toContain("owner-level");
    expect(joinMarkup).not.toContain("owner-level");
  });
});
