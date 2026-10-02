"use client";

import { useState } from "react";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001/api"}/auth/password/forgot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to send reset email");
      }
      setMessage("If an account exists for that email, a reset link was sent.");
    } catch (err: any) {
      setError(err?.message || "Unable to send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2 text-gray-800">Forgot Password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email to receive a password reset link.</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-orange-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#FFA500] text-white font-semibold py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
