import type {Request,Response,NextFunction} from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedUser } from "../types/auth.js";

const JWT_SECRET=process.env.JWT_SECRET;

if(!JWT_SECRET){
    throw new Error("JWT_SECRET is not defined");
}


export const authenticate=(
    req:Request,
    res:Response,
    next:NextFunction
)=>{
    const authHeader=req.headers.authorization;
    
    console.log("ALL HEADERS:", req.headers);
    console.log("AUTH HEADER:", authHeader);
    if(!authHeader||!authHeader.startsWith("Bearer")){
        return res.status(401).json({
            success:false,
            message:"Authentication required"
        });
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
    return res.status(401).json({
        success: false,
        message: "Invalid authorization header"
    });
}
    try{
        
        const decoded=jwt.verify(token,JWT_SECRET);
        // console.log("Authenticated User :",decoded);
        if(typeof decoded === "string"){
            return res.status(401).json({
                success:false,
                message:"Invalid tokens"
            });
        }

        const user:AuthenticatedUser={
            userId:decoded.userId as number,
            role:decoded.role as AuthenticatedUser["role"]
        };

        req.user=user;

        next();
    }
    catch(error){
        return res.status(401).json({
            success:false,
            message:"Invalid or expired token"
        });
    }
    
};