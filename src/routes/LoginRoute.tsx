import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function LoginRoute() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return setError(error.message);
    navigate("/");
  };

  return <form onSubmit={submit}><h2>Login</h2><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" /><input value={password} onChange={(e)=>setPassword(e.target.value)} type="password" placeholder="Password" /><button type="submit">Login</button>{error && <p>{error}</p>}<Link to="/signup">Signup</Link> <Link to="/reset">Reset</Link></form>;
}
