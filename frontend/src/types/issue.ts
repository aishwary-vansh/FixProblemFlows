export type IssueStatus=
 | "NEW"
  | "ASSIGNED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED";

export type IssuePriority=
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "CRITICAL";

  export type UserRole=
  |"USER"
  |"TECHNICIAN"
  |"ADMIN";

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}


export interface Issue {
  id: number;
  title: string;
  description: string;
  location: string;

  status: IssueStatus;
  priority: IssuePriority;

  reporterId: number;
  assigneeId: number | null;

  reporter: UserSummary;
  assignee: UserSummary | null;

  createdAt: string;
  updatedAt: string;
  attachments:IssueAttachment[];
}

export interface IssueAttachment {
    id: number;
    issueId: number;
    fileName: string;
    fileUrl: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
}