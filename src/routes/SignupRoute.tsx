import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function SignupRoute() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    if (error) return setError(error.message);
    navigate("/");
  };

  return <form onSubmit={submit}><h2>Signup</h2><input value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Full name" /><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" /><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="Password" /><button type="submit">Create account</button>{error && <p>{error}</p>}<Link to="/login">Login</Link></form>;
}
