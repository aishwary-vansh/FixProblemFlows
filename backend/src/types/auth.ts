import {Role} from "../generated/prisma/client.js";

export interface AuthenticatedUser{
    userId:number,
    role:Role;
}