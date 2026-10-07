// import Sidebar from "../layouts/Sidebar";
import IssueCard from "../components/IssueCard";
import type {Issue }from "../types/issue";
import {useNavigate } from "react-router-dom";


const Dashboard=()=>{
    const navigate = useNavigate();

    const recentIssues: Issue[] = [
    {
      id: 101,
      title: "Broken classroom projector",
      description: "Projector does not turn on",
      location: "Block A - Room 204",
      status: "NEW",
      priority: "HIGH",

      reporterId: 1,
      assigneeId: null,

      reporter: {
        id: 1,
        name: "Aishwarya",
        email: "user@example.com",
        role: "USER",
      },

      assignee: null,

      createdAt: "2026-09-29T10:00:00Z",
      updatedAt: "2026-09-29T10:00:00Z",
    },

    {
      id: 102,
      title: "Water leakage in hostel",
      description: "Water leaking near the washroom",
      location: "Hostel Block B",
      status: "IN_PROGRESS",
      priority: "CRITICAL",

      reporterId: 2,
      assigneeId: 5,

      reporter: {
        id: 2,
        name: "Rahul",
        email: "rahul@example.com",
        role: "USER",
      },

      assignee: {
        id: 5,
        name: "Technician 1",
        email: "tech@example.com",
        role: "TECHNICIAN",
      },

      createdAt: "2026-09-28T10:00:00Z",
      updatedAt: "2026-09-29T08:00:00Z",
    },
  ];
  const issueStats = [
  {
    label: "New",
    count: 12,
  },
  {
    label: "Assigned",
    count: 7,
  },
  {
    label: "In Progress",
    count: 8,
  },
  {
    label: "Resolved",
    count: 15,
  },
  {
    label: "Closed",
    count: 24,
  },
];
    return(
        <div>
            {/* <Sidebar/> */}
            <main>
                <h2>Fix flow Dashboard</h2>

            <p>Issue Management Dashboard</p>
            <section>
                <h2>Overview</h2>
            <div className="fx-grid-4">
              {issueStats.map((stat)=>(
                <div className="fx-panel fx-stat" key={stat.label}>
                  <h3>{stat.label}</h3>
                  <p>{stat.count}</p>
                </div>
              ))}
            </div>
            </section>
            <section className="fx-section">
              
              <h2>Quick Actions</h2>
              <div className="fx-actions">
                <button className="fx-btn"
                onClick={()=>navigate("/issues")}
                >+Report Issue</button>
                <button className="fx-btn"
                onClick={()=>navigate("/my-issues")}>View my issues</button>
              </div>
            </section>
            <section>
              <h2>Recent Issues</h2>
              {recentIssues.map((issue)=>(
                <IssueCard
                key={issue.id}
                issue={issue}
                />
              ))}
            </section>
            </main>
            
            
        </div>
    );
};

export default Dashboard;