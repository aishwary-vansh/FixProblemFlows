import { tenantPrisma } from "../config/prisma.js";
import { parseLocationList, sameName } from "../domain/locations.js";
import { AppError } from "../utils/AppError.js";
import { audit } from "./audit.service.js";
import type { AuthContext } from "../types/auth.js";

const MAX_NAME_LENGTH = 60;

export const listLocations = async (ctx: AuthContext) => {
    return tenantPrisma(ctx.orgId).location.findMany({
        where: { parentId: null, archived: false },
        select: {
            id: true,
            name: true,
            floors: { where: { archived: false }, select: { id: true, name: true }, orderBy: { id: "asc" } },
        },
        orderBy: { name: "asc" },
    });
};

/** Adds what's new in the pasted list. Names that already exist are reused, and archived ones come back. */
export const addLocations = async (ctx: AuthContext, text: string) => {
    const buildings = parseLocationList(text);

    if (buildings.length === 0) {
        throw AppError.badRequest("Add at least one building");
    }
    if (buildings.some((b) => [b.name, ...b.floors].some((name) => name.length > MAX_NAME_LENGTH))) {
        throw AppError.badRequest(`Names cannot exceed ${MAX_NAME_LENGTH} characters`);
    }

    await tenantPrisma(ctx.orgId).$transaction(async (tx) => {
        const existing = await tx.location.findMany();

        const findOrCreate = async (name: string, parentId: number | null) => {
            const match = existing.find((row) => row.parentId === parentId && sameName(row.name, name));
            if (!match) {
                return tx.location.create({ data: { orgId: ctx.orgId, name, parentId } });
            }
            if (match.archived) {
                await tx.location.updateMany({ where: { id: match.id }, data: { archived: false } });
            }
            return match;
        };

        for (const building of buildings) {
            const { id } = await findOrCreate(building.name, null);
            for (const floor of building.floors) {
                await findOrCreate(floor, id);
            }
        }

        await audit(ctx, "locations.saved", buildings.map((b) => b.name).join(", ").slice(0, 200), undefined, tx);
    });

    return listLocations(ctx);
};

/** Removes a building (with its floors) or one floor from the dropdowns. Old issues keep their text. */
export const archiveLocation = async (ctx: AuthContext, locationId: number) => {
    const db = tenantPrisma(ctx.orgId);
    const location = await db.location.findFirst({
        where: { id: locationId, archived: false },
        select: { name: true, parent: { select: { name: true } } },
    });
    if (!location) {
        throw AppError.notFound("Location");
    }

    await db.$transaction(async (tx) => {
        await tx.location.updateMany({
            where: { archived: false, OR: [{ id: locationId }, { parentId: locationId }] },
            data: { archived: true },
        });
        await audit(ctx, "location.removed", [location.parent?.name, location.name].filter(Boolean).join(" · "), undefined, tx);
    });
};
