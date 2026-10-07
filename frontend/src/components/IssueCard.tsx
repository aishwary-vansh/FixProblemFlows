import type {Issue } from"../types/issue";
import StatusBadge from "./StatusBadge";

interface IssueCardProps{
    issue:Issue;
}

const IssueCard=({issue}:IssueCardProps)=>{
    return(
        <div>
            <h2>{issue.title}</h2>
            <p>Issue #{issue.id}</p>
            <p>Location : {issue.location}</p>
            <p>Priority: {issue.priority}</p>

            <p>
                Status:<StatusBadge status={issue.status}/>
            </p>
            <p>
                Assigned to:{" "}
                {issue.assignee?issue.assignee.name:"Not Assigned"}
            </p>
        </div>
    );
};

export default IssueCard;