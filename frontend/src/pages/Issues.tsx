// import IssueCard from "../components/IssueCard";
import type { Issue } from "../types/issue";
import { useEffect,useState } from "react";
import api from "../services/api";
import CreateIssue from "./CreateIssue";
import { useNavigate } from "react-router-dom";

const Issues=()=>{
    const navigate=useNavigate();
    const [issues,setIssues]=useState<Issue[]>([]);
    const [loading,setLoading]=useState(true);
    const [error,setError]=useState("");
    const [showCreateIssue, setShowCreateIssue] = useState(false);
    useEffect(()=>{
        const fetchIssues=async()=>{
            try{
                const response=await api.get("/issues");
                setIssues(response.data.data);
            }
            catch (err) {
                console.error("Failed to load issues",err);
                setError("Failed to load issues");
            }
            finally{
                setLoading(false);
            }
        };
        fetchIssues();
    },[]);
        const handleIssueCreated=(newIssue:Issue)=>{
        setIssues((currentIssues)=>[
            newIssue,
            ...currentIssues
        ]);
        setShowCreateIssue(false);
    };
    return (
        <main>
            <div className="fx-page-head">
                <h2>Issues</h2>
                <p>View and manage all reported issues</p>
            </div>
            <section className="fx-section">
                <button className="fx-btn"
                onClick={()=>setShowCreateIssue(true)}
                >
                    +Report Issue
                </button>

            </section>
            <section className="fx-section">
                <h2>Filters</h2>
                <div className="fx-oneline">
                    <div>
                        <input type="text"
                    className="fx-select-1"
                    placeholder="Search Issues...."
                    />
                    </div>
                    <div className="fx-space">
                        <select className="fx-select-2">
                        <option>Status</option>
                        <option >New</option>
                        <option>In Progress</option>
                        <option>Resolved</option>
                    </select>
                    <select className="fx-select-2">
                        <option>Priority</option>
                        <option>Low</option>
                        <option>Medium</option>
                        <option>High</option>
                        <option>Critical</option>
                    </select>
                    </div>
                    
                </div>
            </section>
            <section className="fx-section">
                <h2>All issues</h2>
                {loading && (<div className="fx-empty">
                    Loading issues...
                </div>
                )}
                {error && (
                    <div className="fx-empty">
                        {error}
                    </div>
                )}
                {!loading && !error && issues.length===0 && (
                    <div className="fx-empty">
                        No issues available
                    </div>
                )}
                {!loading && !error && issues.length > 0 && (
                <div className="fx-table-wrapper">
                    <table className="fx-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Issue</th>
                                <th>Location</th>
                                <th>Priority</th>
                                <th>Status</th>
                                <th>Assigned To</th>
                            </tr>
                        </thead>

                        <tbody>
                            {issues.map((issue) => (
                                <tr key={issue.id}
                                onClick={()=> navigate(`/issues/${issue.id}`)}
                                className="fx-issue-row">
                                    <td>#{issue.id}</td>

                                    <td>
                                        <strong>{issue.title}</strong>
                                        <span className="fx-table-description">
                                            {issue.description}
                                        </span>
                                    </td>

                                    <td>{issue.location}</td>

                                    <td>{issue.priority}</td>

                                    <td>{issue.status}</td>

                                    <td>
                                        {issue.assignee
                                            ? issue.assignee.name
                                            : "Unassigned"}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            </section>
            {showCreateIssue && (
                <CreateIssue onClose={()=>setShowCreateIssue(false)}
                    onIssueCreated={handleIssueCreated}

                />
            )}

        </main>
    )
}




export default Issues;