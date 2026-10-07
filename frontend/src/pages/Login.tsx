import { useState} from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import AuthLayout, { Field } from "../layouts/AuthLayout";

const Login=()=>{
    const [email,setEmail]=useState("");
    const [password,setpassWord]=useState("");

    const [loading,setLoading]=useState(false);
    const [error,setError]=useState("");

    const navigate=useNavigate();
    const handleSubmit=async (e:React.FormEvent<HTMLFormElement>)=>{
        e.preventDefault();
        setError("");
        setLoading(true);
        try{
            const response=await api.post("/auth/login",{
                email,
                password
            });
            console.log("Login response :",response.data);
            const{token,user} =response.data.data;
            localStorage.setItem("token",token);
            localStorage.setItem("user",JSON.stringify(user));
            navigate("/dashboard");
        }
        catch(e){
            console.error("Login error",e);
            setError("Invalid email or password");
        }
        finally{
            setLoading(false);
        }
        
    };

    return (
        <AuthLayout
            title="Welcome back to Fixflow"
            footer={
                <>
                Don't have an account{" "}
                <Link to ="/signup">Create an account</Link>
                </>
            }
            >

            <form onSubmit={handleSubmit} className="fa-card">
                <Field
                    label="Email"
                    type="email" 
                    value={email}
                    onChange={setEmail}
                    placeholder="Enter your email"
                    autoComplete="email"
                    />
                
                <Field
                    label="Password"
                    type="password" 
                    value={password}
                    onChange={setpassWord}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    />
                {error && (<div className="fa-msg fa-err">
                        {error}
                    </div>)}
                <button type="submit" disabled={loading} className="fa-btn">
                    {loading ?"Logging In ...":"Login"}
                </button>
            </form>
        </AuthLayout>
    );
};


export default Login;