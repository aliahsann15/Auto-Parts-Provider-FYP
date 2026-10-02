"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const ResetPasswordPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Reset token is missing. Please use the link from your email.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (!password || password !== confirmPassword) {
      setError("Passwords must match and cannot be empty.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001/api"}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.msg || "Failed to reset password");
      }
      setMessage("Password updated. You can now log in.");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: any) {
      setError(err?.message || "Unable to reset password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2 text-gray-800">Reset Password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your new password below.</p>

        {error && <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-300 rounded">{error}</div>}
        {message && <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded">{message}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-orange-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#FFA500] text-white font-semibold py-2 rounded-md hover:bg-orange-600 disabled:opacity-50"
          >
            {submitting ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
