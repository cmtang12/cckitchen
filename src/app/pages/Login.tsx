import React, { useState } from "react";
import { useNavigate } from "react-router";
import { login } from "../utils/auth";

export function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (login(password)) {
      navigate("/");
    } else {
      setError(true);
      setPassword("");
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">CCKitchen</h1>
          <p className="text-muted-foreground mt-2">Enter your password to continue</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {error && (
            <p className="text-sm text-red-500">Incorrect password. Try again.</p>
          )}
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-[#E07B67] text-white font-medium hover:bg-[#D16A56] transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
