import type {IssueStatus} from "../types/issue";
interface StatusBadgeProps{
    status:IssueStatus;
}

const StatusBadge=({status}:StatusBadgeProps)=>{
    return <span>{status}</span>
}

export default StatusBadge;