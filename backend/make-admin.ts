import "dotenv/config";
import prisma from "./src/config/prisma.js";

const email = "rahul10@example.com";

const user = await prisma.user.update({
  where: {
    email
  },
  data: {
    role: "ADMIN"
  }
});

console.log("Admin created:", {
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

await prisma.$disconnect();