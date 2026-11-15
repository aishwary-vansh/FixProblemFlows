import { randomBytes } from "node:crypto";
import prisma, { tenantPrisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { formatIssueLocation } from "../domain/locations.js";
import { AppError } from "../utils/AppError.js";
import { audit } from "./audit.service.js";
import { assertCanAddReportPoint } from "./plan.service.js";
import type { AuthContext } from "../types/auth.js";
import type { CreateReportPointInput } from "../validators/reportPoint.validator.js";

const pointSelect = {
    id: true,
    name: true,
    code: true,
    spot: true,
    createdAt: true,
    location: { select: { id: true, name: true, parentId: true, parent: { select: { name: true } } } },
} as const;

type PointRow = {
    code: string;
    spot: string | null;
    location: { id: number; name: string; parentId: number | null; parent: { name: string } | null } | null;
};

const appUrl = () => env.APP_URL.replace(/\/$/, "");

/** Adds the readable place and the link the QR code opens. */
const toPointDto = <T extends PointRow>(point: T) => ({
    ...point,
    place: formatIssueLocation(point.location, point.spot ?? ""),
    url: `${appUrl()}/r/${point.code}`,
});

export const listReportPoints = async (ctx: AuthContext) => {
    const points = await tenantPrisma(ctx.orgId).reportPoint.findMany({
        where: { archived: false },
        select: pointSelect,
        orderBy: { name: "asc" },
    });
    return points.map(toPointDto);
};

/** A QR for any region the admin picks. The building or floor and the exact spot are both optional. */
export const createReportPoint = async (ctx: AuthContext, input: CreateReportPointInput) => {
    await assertCanAddReportPoint(ctx.orgId);
    const db = tenantPrisma(ctx.orgId);

    if (input.locationId) {
        const location = await db.location.findFirst({ where: { id: input.locationId, archived: false } });
        if (!location) {
            throw AppError.notFound("Location");
        }
    }

    return db.$transaction(async (tx) => {
        const point = await tx.reportPoint.create({
            data: {
                orgId: ctx.orgId,
                name: input.name,
                code: randomBytes(9).toString("base64url"),
                locationId: input.locationId ?? null,
                spot: input.spot || null,
            },
            select: pointSelect,
        });
        await audit(ctx, "report_point.created", point.name, undefined, tx);
        return toPointDto(point);
    });
};

/** Printed QR codes for this point stop working; issues already reported keep their place. */
export const archiveReportPoint = async (ctx: AuthContext, pointId: number) => {
    const db = tenantPrisma(ctx.orgId);
    const point = await db.reportPoint.findFirst({ where: { id: pointId, archived: false } });
    if (!point) {
        throw AppError.notFound("QR point");
    }

    await db.$transaction(async (tx) => {
        await tx.reportPoint.updateMany({ where: { id: pointId }, data: { archived: true } });
        await audit(ctx, "report_point.removed", point.name, undefined, tx);
    });
};

/** For the report form of a signed-in member: what to prefill. */
export const getReportPointForMember = async (ctx: AuthContext, code: string) => {
    const point = await tenantPrisma(ctx.orgId).reportPoint.findFirst({
        where: { code, archived: false },
        select: pointSelect,
    });
    if (!point) {
        throw AppError.notFound("QR point");
    }
    // An archived building or floor is no longer in the dropdowns, so don't preselect it.
    const location = point.location
        ? await tenantPrisma(ctx.orgId).location.findFirst({ where: { id: point.location.id, archived: false } })
        : null;

    return { name: point.name, spot: point.spot, location: location ? { id: location.id, parentId: location.parentId } : null };
};

/**
 * What someone sees after scanning, before logging in: the place and the organization.
 * When the organization's join link is on, the QR doubles as a way in for new residents. It joins through
 * the point's own code, so the organization's join code (which admins rotate) is never revealed.
 */
export const getReportPointPreview = async (code: string) => {
    const point = await prisma.reportPoint.findUnique({
        where: { code },
        select: { name: true, archived: true, organization: { select: { id: true, name: true, joinCode: true } } },
    });
    if (!point || point.archived) {
        throw AppError.notFound("QR code");
    }

    return {
        name: point.name,
        organization: { id: point.organization.id, name: point.organization.name },
        joinPath: point.organization.joinCode ? `/join/${code}` : null,
    };
};
