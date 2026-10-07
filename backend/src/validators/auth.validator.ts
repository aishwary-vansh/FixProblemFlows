import {z} from "zod";

export const registerSchema = z
.object({
    name:z
    .string()
    .min(2,"Name must be atleast 2 characters"),

    email:z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),

    password:z.string().min(6,"Password must be at leaSt 6 characters").max(50,
        "Password cannot have more than 50 characters")
        .regex(/[A-Z]/,"Password must have uppercase letter")
        .regex(/[a-z]/,"Password must contain a  lowercase letter")
        .regex(/[^a-zA-Z0-9]/,"Password must contain a special character"),
    
    confirmPassword:z.string(),

    phone:z
        .string()
        .regex(/^[6-9]\d{9}$/,"Invalid phone number"),

    // role:z.enum(["USER","TECHNICIAN"]),

    termsAccepted : z
    .boolean()
    .refine(value => value === true,{
        message:"Ypu must accept terms and conditions"
    })
})
.refine(data=>data.password === data.confirmPassword,{
    message:"Passowrds do not match",
    path:["confirmPassword"]
});


export const loginSchema=z.object({
    email:z
    .string()
    .email("Invalid email address")
    .toLowerCase()
    .trim(),


    password:z
    .string()
    .min(1,"Password is required")
});


