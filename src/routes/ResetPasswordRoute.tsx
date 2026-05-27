import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function ResetPasswordRoute() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMsg("");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return setError(error.message);
    setMsg("Password reset email sent.");
  };

  return <form onSubmit={submit}><h2>Password reset</h2><input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email" /><button type="submit">Send reset link</button>{msg && <p>{msg}</p>}{error && <p>{error}</p>}<Link to="/login">Login</Link></form>;
}
