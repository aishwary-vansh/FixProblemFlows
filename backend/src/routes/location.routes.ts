import { Router } from "express";
import type { Request, Response } from "express";
import { authenticate, getAuth } from "../middleware/auth.middleware.js";
import { authorise, ADMIN_ROLES } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { addLocations, archiveLocation, listLocations } from "../services/location.service.js";
import { addLocationsSchema, idParamSchema } from "../validators/member.validator.js";

const router = Router();

router.use(authenticate);

// Every member needs this list to fill in the report form.
router.get("/", async (req: Request, res: Response) => {
    res.status(200).json({ success: true, data: await listLocations(getAuth(req)) });
});

router.post(
    "/",
    authorise(...ADMIN_ROLES),
    validate({ body: addLocationsSchema }),
    async (req: Request, res: Response) => {
        const locations = await addLocations(getAuth(req), req.body.text);
        res.status(201).json({ success: true, message: "Locations saved", data: locations });
    }
);

router.delete(
    "/:id",
    authorise(...ADMIN_ROLES),
    validate({ params: idParamSchema }),
    async (req: Request, res: Response) => {
        await archiveLocation(getAuth(req), Number(req.params.id));
        res.status(200).json({ success: true, message: "Location removed" });
    }
);

export default router;
