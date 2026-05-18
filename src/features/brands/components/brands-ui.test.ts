import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BrandInviteTable } from "./BrandInviteTable";
import { BrandJoinRequestTable } from "./BrandJoinRequestTable";
import { BrandMembershipTable } from "./BrandMembershipTable";
import { ProductBrandField } from "./ProductBrandField";

const now = "2026-05-18T06:30:00.000Z";

describe("brands UI surfaces", () => {
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
      }),
    );

    expect(markup).toContain("No brand (brandless)");
    expect(markup).toContain("optional catalog group");
    expect(markup).toContain("JRW is seller of record");
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
      }),
    );

    expect(markup).toContain("ACTIVE");
    expect(markup).toContain("PENDING");
    expect(markup).toContain("status-badge");
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
      }),
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
      }),
    );

    expect(inviteMarkup).toContain("PENDING");
    expect(inviteMarkup).toContain("Unavailable");
    expect(joinMarkup).toContain("Approve");
    expect(joinMarkup).toContain("Reject");
  });
});

