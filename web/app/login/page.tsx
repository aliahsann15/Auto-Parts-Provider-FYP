"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FcGoogle } from "react-icons/fc";
import Newsletter from "../components/newsletter/newsletter"; // Assuming this component exists
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import Image from "@/app/components/AppImage";


const LoginPage: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState<string | null>(null); // For displaying login errors
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button on submit
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false); // To disable button on submit
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();

  // decide where to go after login:
  // if a page set ?callbackUrl=/some/path, use it; otherwise default to home
  const redirectTo =
    searchParams.get("callbackUrl") ||
    searchParams.get("redirect") ||
    "/";

  useEffect(() => {
    if (status === "authenticated") {
      router.push(redirectTo || "/");
    }
  }, [status, router, redirectTo]);

  const handleGoogleSignIn = async () => {
    setIsGoogleSubmitting(true);
    setError(null);
    const result = await signIn("google", {
      callbackUrl: redirectTo || "/",
    });
    if (result?.error) {
      console.error("Google Sign-In Error:", result.error);
      setError(`Google Sign-In Error: ${result.error}`);
    }
    setIsGoogleSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const loginIdentifier = formData.username.trim();

    try {
      const result = await signIn("credentials", {
        redirect: false, // Important: handle success/error manually based on result
        identifier: loginIdentifier,
        email: loginIdentifier,
        password: formData.password,
        callbackUrl: redirectTo || "/" // redirect back if provided, else home
      });

      if (result?.error) {
        setError(result.error || "Login failed. Please check your credentials.");
        console.error("Credentials Sign-In Error:", result.error);
      } else if (result?.ok) {
        router.push(redirectTo || "/");
      } else {
        setError("An unexpected error occurred during login.");
      }
    } catch (err: any) {
      console.error("Login submit catch error:", err);
      setError(`Error: ${err.message || "An unexpected error occurred."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === "loading") {
    return <div className="flex justify-center items-center min-h-screen">Loading session...</div>;
  }

  // If user is already authenticated, they shouldn't see the login page
  // (though the useEffect also handles this, this provides immediate feedback)
  if (status === "authenticated") {
    return <div className="flex justify-center items-center min-h-screen">Redirecting...</div>;
  }

  return (
    <>
      <div className="bg-white pt-16 px-4 md:px-8">
        <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
          <div className="p-8 flex flex-col justify-center h-full">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">LOG IN</h2>
              <p className="text-sm text-gray-400">PLEASE ENTER YOUR EMAIL AND PASSWORD</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 border border-red-400 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1" htmlFor="username">Username/Email*</label>
                <input
                  id="username"
                  type="text" // Or "email" if you only accept emails
                  placeholder="Enter your username or email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]"
                  value={formData.username}
                  onChange={(e) => setFormData({
                    ...formData,
                    username: e.target.value,
                  })}
                  disabled={isSubmitting}
                  autoComplete="username"
                />
              </div>

              <div className="mb-8 relative">
                <label className="block text-sm font-medium mb-1" htmlFor="password">Password *</label>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]"
                  value={formData.password}
                  onChange={(e) => setFormData({
                    ...formData,
                    password: e.target.value,
                  })}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9" // Adjust top value if label changes height
                  disabled={isSubmitting}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              <div className="flex justify-between items-center mb-4">
                <Link href="/forgot-password" className="text-sm text-[#FFA500] hover:underline">
                  Forgot password?
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    setError(null);
                    if (!formData.username) {
                      setError("Enter your email first, then tap Forgot password.");
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4001/api"}/auth/password/forgot`,
                        {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ email: formData.username }),
                        }
                      );
                      setError("If that email exists, a reset link was sent.");
                    } catch (err: any) {
                      setError(err?.message || "Unable to send reset email.");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="text-sm text-gray-600 underline disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Send link
                </button>
              </div>

              <button
                type="submit"
                className="w-full bg-[#FFA500] text-white font-semibold py-2 rounded-md mb-4 hover:bg-orange-600 disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in..." : "Log In"}
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="cursor-pointer w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50"
                disabled={isGoogleSubmitting}
              >
                <FcGoogle className="w-5 h-5 mr-2" />
                {isGoogleSubmitting ? "Processing..." : "Sign in with Google"}
              </button>
              <div className="relative my-4">
                <Link
                  type="button"
                  className="cursor-pointer w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-100  hover:bg-gray-700 disabled:opacity-50 bg-black"
                  href="/buyer/register"
                >
                  Register as buyer
                </Link>
                <Link
                  type="button"
                  className="cursor-pointer w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-100  hover:bg-gray-700 disabled:opacity-50 bg-black"
                  href="/seller/register"
                >
                  Register as seller
                </Link>
              </div>
            </form>
          </div>
          <div className="hidden md:block relative">
            <Image
              src="/images/sellerregister1.jpg"
              alt="Login Visual"
              fill
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <Newsletter />
    </>
  );
};

export default LoginPage;
