import type {Request,Response} from "express";
import {registerUser,loginUser} from "../services/auth.services.js"
import {registerSchema,loginSchema } from "../validators/auth.validator.js"


export const register=async (req:Request,res:Response)=>{
    try{

        const result=registerSchema.safeParse(req.body);
        if(!result.success){
            return res.status(400).json({
                success:false,
                message:"Validation failed",
                errors:result.error.issues
            });
        }

        const {name,
            email,
            password,
            phone}=result.data;

            const user=await registerUser(
                name,
                email,
                password,
                phone
            );
        

        return res.status(201).json({
            success:true,
            message:"User successfully registered",
            data:user
        });
    }
    catch(error){
        console.error(error);
        res.status(400).json({
            success:false,
            message: error instanceof Error
            ? error.message
            : "Something went wrong"
        });
    }

};


export const login=async(req:Request,res:Response)=>{
    try{
        const result=loginSchema.safeParse(req.body);

        if(!result.success){
            return res.status(401).json({
                success:false,
                message:"Validation failed",
                errors:result.error.issues
            });
        }

        const {email,password }=result.data;
        const resultData=await loginUser(
            email,
            password
        );

        return res.status(200).json({
            success:true,
            message:"Login successful",
            data:resultData
        });
    }
    catch(error){
        console.log("LOGIN ERROR",error);

        return res.status(401).json({
            success:false,
            message:error instanceof Error?
            error.message:"Login failed"
        });
    }
}

export const getMe=async(req:Request,res:Response)=>{
    return res.status(200).json({
        success:true,
        data:{
            userId:req.user?.userId,
            role:req.user?.role

        }
        
    })
}