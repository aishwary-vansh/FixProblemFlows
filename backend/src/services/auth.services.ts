import prisma from "../config/prisma.js";
import {hashPassword,comparePassword } from "../utils/password.js";
import {generateToken} from "../utils/jwt.js"


export const registerUser=async (
    name:string,
    email:string,
    password:string,
    phone:string
)=>{
    const existingUsers=await prisma.user.findUnique({
        where:{
            email
        }
    });

    if(existingUsers){
        throw new Error("User with thsi email already exists");
    }
    const passwordHash = await hashPassword(password);
    const user=await prisma.user.create({
            data:{
                name,
                email,
                passwordHash,
                phone
            }
    });

    return{
        id:user.id,
        name:user.name,
        email:user.email,
        phone:user.phone,
        role: user.role
    };
};


export const loginUser=async(
    email:string,
    password:string
)=>{
    const user=await prisma.user.findUnique({
        where :{
            email
        }
    });

    if(!user){
        throw new Error("Invalid email or password");
    }

    const passwordMatch=await comparePassword(
        password,
        user.passwordHash
    );

    if(!passwordMatch){
        throw new Error("Invalid email or password");
    }

    const token=generateToken(
        user.id,
        user.role
    );


    return {
        token,
        user:{
            id:user.id,
            name:user.name,
            email:user.email,
            phone:user.phone,
            role:user.role
        }
    };
};