import express from "express";
import "dotenv/config";
import cors from "cors";
import helmet from "helmet";
import prisma from "./config/prisma.js"
import authRoutes from "./routes/auth.routes.js"
import issueRoutes from "./routes/issue.routes.js"
import path from "path";

const app=express();

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use("/api/auth",authRoutes);
app.use("/api/issues",issueRoutes)
app.get('/',(req,res)=>{
    res.json({
        success:true,
        message:"FixFlow API is working"
    });
});
app.use("/uploads",express.static(path.join(process.cwd(),"uploads"))
);
app.get("/test-db",async(req,res)=>{
    try{
        const userCount=await prisma.user.count();
        res.json({
            success:true,
            message:"Database connected",
            users:userCount
        });
    }
    catch(error){
        console.error(error);

        res.status(500).json({
            success:false,
            message:"Database connection failed",
            error: error instanceof Error ? error.message : String(error)
        });
    }
});


export default app;