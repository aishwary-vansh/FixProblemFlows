import { Router } from "express";
import {register,login,getMe } from "../controllers/auth.controllers.js"
import { authenticate } from "../middleware/auth.middleware.js";
import { authorise } from "../middleware/role.middleware.js";
import { Role } from "../generated/prisma/enums.js";

const router=Router();

router.post("/register",register);
router.post("/login",login);
router.get("/me",authenticate,getMe);


export default router;