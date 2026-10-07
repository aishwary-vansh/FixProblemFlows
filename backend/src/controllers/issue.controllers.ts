import type { Request,Response } from "express";
import { acceptIssue, assignIssues, closeIssues, createIssue, getIssues, reopenIssue, resolveIssue, startIssue ,getIssueById,addIssueAttachment} from "../services/issue.services.js";
import { assignIssueSchema, createIssueSchema } from "../validators/issue.validator.js";
import { success } from "zod";

export const createIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const result=createIssueSchema.safeParse(req.body);

        if(!result.success){
            return res.status(400).json({
                success:false,
                message:"Validation failed",
                error:result.error.issues
            });
        }

        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication failed"
            });
        }


        const {
            title,
            description,
            location,
            priority
        }=result.data;

        const issue=await createIssue(
            title,
            description,
            location,
            priority,
            req.user.userId
        );
        
        return res.status(201).json({
            success:true,
            message:"Issues created successfully",
            data:issue
        });
    }
    catch(e){
        console.error("create issue error: ",e);

        return res.status(500).json({
            success:false,
            message:"Failed to create issue"
        });
    }
};

export const getIssuesController=async(
    req:Request,
    res:Response
)=>{
    try{
        if(!req.user){
        return res.status(401).json({
            success:false,
            message:"Authentication Required"
        });
    }

    const issues=await getIssues(
        req.user.userId,
        req.user.role
    );

    return res.status(200).json({
        success:true,
        data:issues
    });
    }
    catch(e){
        console.error("Get issues error:",e);
        return res.status(500).json({
            success:false,
            message:"Failed to fetch issues"
        });
    }
};

export const assignIssuesController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<=0){
            return res.status(400).json({
                success:false,
                message:"Invalid issue ID"
            });
        }

        const result=assignIssueSchema.safeParse(req.body);

        if(!result.success){
            return res.status(400).json({
                success:false,
                message:"Validation failed",
                errors:result.error.issues
            });
        }


        const issue=await assignIssues(
            issueId,
            result.data.technicianId
        );

        return res.status(200).json({
            success:true,
            message:"Issues successfully assigned",
            data:issue
        });


    }
    catch(e){
        console.error("Assign issue error",e);

        return res.status(400).json({
            success:false,
            message:e  instanceof Error
            ?e.message:
            "Failed to assign issue"
        });
    }
};


export const acceptIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<=0){
            return res.status(400).json({
                sucess:false,
                message:"Invalid issue id"
            });
        }

        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication required"
            });
        }

        const issue=await acceptIssue(
            issueId,
            req.user.userId
        );

        return res.status(200).json({
            success:true,
            message:"Issue successfully accepted",
            data:issue
        });
        }
        catch(e){
            console.error("Accept issue error",e);

            return res.status(401).json({
                success:false,
                message:e instanceof Error
                ?e.message
                :"Failed to accept issue"
            });
        }
};

export const startIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<0){
            return res.status(400).json({
                success:false,
                message:"Issue id is invalid"
            });
        }

        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication required"
            });
        }

        const issue=await startIssue(issueId,
            req.user.userId
        );

        return res.status(200).json({
            success:true,
            message:"Issue started successfully",
            data:issue
        });

    }
    catch(e){
        console.error("START ISSUE ERROR:", e);

    return res.status(400).json({
      success: false,
      message: e instanceof Error
        ? e.message
        : "Failed to start issue"
    });
    }
}

export const resolveIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<=0){
            return res.status(400).json({
                success:false,
                message:"Invalid issue id"
            });
        }

        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication required"
            });
        }

        const issue=await resolveIssue(
            issueId,
            req.user.userId
        );

        return res.status(200).json({
            success:true,
            message:"Issue resolved successfully",
            data:issue
        });
    }
    catch(e){
       console.error("RESOLVE ISSUE ERROR:", e);

        return res.status(400).json({
        success: false,
        message: e instanceof Error
        ? e.message
        : "Failed to resolve issue" 
    });
}
};

export const closeIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<0){
            return res.status(400).json({
                success: false,
                message: "Invalid issue ID"
            });
        }
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }
        const issue=await closeIssues(
            issueId,
            req.user.userId
        );

        return res.status(200).json({
            sucess:true,
            message:
            "Issue closed succesfully",
            data:issue
        });
    }

    catch (error) {
    console.error("CLOSE ISSUE ERROR:", error);

    return res.status(400).json({
      success: false,
      message: error instanceof Error
        ? error.message
        : "Failed to close issue"
    });
  }
}

export const reopenIssueController=async(
    req:Request,
    res:Response
)=>{
    try{
        const issueId=Number(req.params.id);

        if(!Number.isInteger(issueId)||issueId<=0){
            return res.status(400).json({
                success:false,
                message:"Invalid issue id"
            });
        }

        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication required"
            });
        }

        const issue=await reopenIssue(
            issueId,
            req.user.userId
        );

        return res.status(200).json({
            success:true,
            message:"Issue reopened successfully",
            data:issue
        });
    }
    catch(e){
        console.error("REOPEN ISSUE ERROR:", e);

    return res.status(400).json({
      success: false,
      message:
        e instanceof Error
          ? e.message
          : "Failed to reopen issue"
    });
    }
}

export const getIssuesByIdController=async(
    req:Request,
    res:Response
)=>{
    try{
        if(!req.user){
            return res.status(401).json({
                success:false,
                message:"Authentication failed"
            });
        }

        const issueId=Number(req.params.id);
         if (!Number.isInteger(issueId) || issueId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid issue ID"
            });
        }
        const issue=await getIssueById(
            issueId,
            req.user.userId,
            req.user.role
        );

        return res.status(200).json({
            success:true,
            data:issue
        });
    }
    catch(error){
        console.error("GET ISSUE BY ID ERROR:", error);
        if (
            error instanceof Error &&
            error.message === "Issue not found"
        ) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        if (
            error instanceof Error &&
            error.message ===
                "You don't have permission to view this issue"
        ) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to fetch issue"
        });
    }
};

export const addIssueAttachmentController = async (
    req: Request,
    res: Response
) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const issueId = Number(req.params.id);

        if (!Number.isInteger(issueId) || issueId <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid issue ID"
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Image is required"
            });
        }

        const attachment = await addIssueAttachment(
            issueId,
            req.user.userId,
            req.user.role,
            req.file
        );

        return res.status(201).json({
            success: true,
            message: "Attachment uploaded successfully",
            data: attachment
        });

    } catch (error) {
        console.error("ADD ATTACHMENT ERROR:", error);

        return res.status(500).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Failed to upload attachment"
        });
    }
};