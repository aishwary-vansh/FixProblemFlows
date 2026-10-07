import "dotenv/config";
import prisma from "./src/config/prisma.js";

const user=await prisma.user.update({
    where:{
        id:35
    },
    data:{
        role:"TECHNICIAN"
    }
});

console.log("Updated User :",{
    id:user.id,
    name:user.name,
    email:user.email,
    role:user.role
});


await prisma.$disconnect();