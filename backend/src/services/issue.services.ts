import { number } from "zod";
import prisma from "../config/prisma.js";

export const createIssue=async(
    title:string,
    description:string,
    location:string,
    priority:"LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
    reporterId:number
)=>{
    const issue=await prisma.issue.create({
        data:{
            title,
            description,
            location,
            priority,
            reporterId
        }
    });
    return issue;
};


export const getIssues=async(
    userId:number,
    role:"USER"|"TECHNICIAN"|"ADMIN"
)=>{
    if(role==="USER"){
        return await prisma.issue.findMany({
            where:{
                reporterId:userId
            },
            orderBy:{
                createdAt:"desc"
            }
        });
    }

    if(role==="TECHNICIAN"){
        return await prisma.issue.findMany({
            where:{
                assigneeId:userId
            },
            orderBy:{
                createdAt:"desc"
            }
        });
    }

    return await prisma.issue.findMany({
        orderBy:{
            createdAt:"desc"
        }
    });
};

export const assignIssues=async(
    issueId:number,
    technicianId:number
)=>{
    const technician=await prisma.user.findUnique({
        where:{
            id:technicianId
        }
    });

    if(!technician){
        throw new Error("Technincian is not found");
    }

    if(technician.role!="TECHNICIAN"){
        throw new Error("Selected usesr is not a technician");
    }

    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    });

    if(!issue){
        throw new Error("Issue not found");
    }

    const updatedIssue=await prisma.issue.update({
        where:{
            id:issueId
        },
        data:{
            assignee:{
                connect:{
                    id:technicianId
                }
            },
            status:"ASSIGNED"
        }
    });
    return updatedIssue;
}

export const acceptIssue=async(
    issueId:number,
    technicianId:number
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    });

    if(!issue){
        throw new Error("Issue not found");
    }

    if(issue.assigneeId!==technicianId){
        throw new Error("You are not assigned to this issue");
    }

    if(issue.status !=="ASSIGNED"){
        throw new Error("Issue cannot be accepted in its current state");
    }

    const updatedIssue=await prisma.issue.update({
        where:{
            id:issueId
        },
        data:{
            status:"ACCEPTED"
        }
    });
    return updatedIssue;
}

export const startIssue=async(
    issueId:number,
    technicianId:number
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    });

    if(!issue){
        throw new Error("Issue not found");
    }

    if(issue.assigneeId!==technicianId){
        throw new Error("You are not assigned to this issue");

    }

    if(issue.status!=="ACCEPTED"){
        throw new Error(
            "Issue cannot be started in its current status"
        );
    }

    const updatedIssue=await prisma.issue.update({
        where:{
            id: issueId
        },
        data:{
            status:"IN_PROGRESS"
        }
    });

    return updatedIssue;
}

export const resolveIssue=async(
    issueId:number,
    technicianId:number
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    })

    if(!issue){
        throw new Error("Issue not found");
    }

    if(issue.assigneeId!=technicianId){
        throw new Error("You are not alloted to this issue");
    }

    if(issue.status!=="IN_PROGRESS"){
        throw new Error("Issue cannot be resolved in current state");
    }

    const updatedIssue=await prisma.issue.update({
        where:{
            id:issueId
        },
        data:{
            status:"RESOLVED"
        }
    });

    return updatedIssue;
}


export const closeIssues=async(
    issueId:number,
    userId:number
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    });

    if(!issue){
        throw new Error("Issue not found");
    }

    if(issue.reporterId!==userId){
        throw new Error("You are not the treported of this issue");
    }

    if (issue.status !== "RESOLVED") {
        throw new Error(
            "Issue cannot be closed in its current status"
        );
    }

    const updatedIssue=await prisma.issue.update({
        where:{
            id :issueId
        },
        data:{
            status:"CLOSED"
        }
    });

    return updatedIssue;

}

export const reopenIssue=async(
    issueId: number,
    userId:number
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        }
    });

    if(!issue){
        throw new Error("Issue not found");
    }

    if(issue.reporterId!==userId){
        throw new Error("You are not reporter of this issue");
    }

    if(issue.status!=="RESOLVED"){
        throw new Error(
            "Issue cannot be reopened in current state"
        );
    }
    const updatedIssue=await prisma.issue.update({
        where:{
            id:issueId
        },
        data:{
            status:"REOPENED"
        }
    });
    return updatedIssue;
};
export const getIssueById=async(
    issueId:number,
    userId:number,
    role:"USER"|"TECHNICIAN"|"ADMIN"
)=>{
    const issue=await prisma.issue.findUnique({
        where:{
            id:issueId
        },
        include:{
            reporter:{
                select:{
                    id:true,
                    name:true,
                    email:true
                }
            },
            assignee: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            attachments: {
            orderBy: {
                createdAt: "desc"
            }
        }
    }
});
    if (!issue) {
        throw new Error("Issue not found");
    }
    if(role==='USER' && issue.reporterId!==userId){
        throw new Error("You dont have permission to view this issue");
    }

    if(role==="TECHNICIAN"&& issue.assigneeId!==userId){
        throw new Error("You don't have permission to view this issue");
    }
    return issue;
};

export const addIssueAttachment = async (
    issueId: number,
    userId: number,
    role: "USER" | "TECHNICIAN" | "ADMIN",
    file: Express.Multer.File
) => {
    const issue = await prisma.issue.findUnique({
        where: {
            id: issueId
        }
    });

    if (!issue) {
        throw new Error("Issue not found");
    }

    // USER → only their own issues
    if (
        role === "USER" &&
        issue.reporterId !== userId
    ) {
        throw new Error(
            "You don't have permission to attach a file to this issue"
        );
    }

    // TECHNICIAN → only issues assigned to them
    if (
        role === "TECHNICIAN" &&
        issue.assigneeId !== userId
    ) {
        throw new Error(
            "You don't have permission to attach a file to this issue"
        );
    }

    // ADMIN → can attach to any issue

    const attachment = await prisma.attachment.create({
        data: {
            issueId,
            fileName: file.originalname,
            fileUrl: `/uploads/issues/${file.filename}`,
            mimeType: file.mimetype,
            fileSize: file.size
        }
    });

    return attachment;
};