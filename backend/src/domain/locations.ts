export interface BuildingInput {
    name: string;
    floors: string[];
}

export const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/**
 * Reads the admin's pasted list, one building per line:
 *   Block A: Ground, 1st, 2nd
 *   Mess
 * Repeated buildings merge, so "Block A: 3rd" later on just adds a floor.
 */
export const parseLocationList = (text: string): BuildingInput[] => {
    const buildings: BuildingInput[] = [];

    for (const line of text.split("\n")) {
        const [rawName = "", ...rest] = line.split(":");
        const name = rawName.trim();
        if (!name) continue;

        let building = buildings.find((b) => sameName(b.name, name));
        if (!building) {
            building = { name, floors: [] };
            buildings.push(building);
        }

        for (const rawFloor of rest.join(":").split(",")) {
            const floor = rawFloor.trim();
            if (floor && !building.floors.some((f) => sameName(f, floor))) {
                building.floors.push(floor);
            }
        }
    }

    return buildings;
};

interface Place {
    name: string;
    parent: { name: string } | null;
}

/** The readable location saved on an issue, e.g. "Block A · 2nd Floor · Room 204". */
export const formatIssueLocation = (place: Place | null, spot: string) =>
    [place?.parent?.name, place?.name, spot].filter(Boolean).join(" · ");
