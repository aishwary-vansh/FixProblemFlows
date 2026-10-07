import type {Request,Response,NextFunction} from "express";
import {Role} from "../generated/prisma/client.js";

export const authorise=(...allowedRoles:Role[])=>{
    return(
        req:Request,
        res:Response,
        next:NextFunction
    )=>{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication required"
            });
        }

        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({
                success:false,
                message:"You dont have permission to access this rresuorces"
            });
        }

        next();
    };
};