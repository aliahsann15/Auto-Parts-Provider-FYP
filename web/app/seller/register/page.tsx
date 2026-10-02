"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Newsletter from "@/app/components/newsletter/newsletter";
import Link from "next/link";
import Image from "@/app/components/AppImage";
import React, { useState, useCallback } from "react"; // Added useCallback
import { signIn } from "next-auth/react";

const SignupSellerPage = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showLicense, setShowLicense] = useState(false);
    const [verificationURL, setVerificationURL] = useState<string>("");

    const [formData, setFormData] = useState({
        name: "",
        phoneNumber: "",
        email: "",
        password: "",
        confirmPassword: "",
        businessName: "",
        businessType: "",
        licenseNumber: "",
        businessStreet: "",
        businessCity: "",
        businessProvince: "",
        businessPostalCode: "",
        businessCountry: "Pakistan",
        bankAccountNumber: "",
        accountTitle: "",
        branchCode: "",
        role: "Seller",
        cnic: "",
        consent: true, // Defaulting to true, ensure this is desired behavior
    });

    // 1. Error State
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [cnicFrontFile, setCnicFrontFile] = useState<File | null>(null);
    const [cnicBackFile, setCnicBackFile] = useState<File | null>(null);
    //  const [cnicFrontPreview, setCnicFrontPreview] = useState<string | null>(null);
    //  const [cnicBackPreview, setCnicBackPreview] = useState<string | null>(null);

    //  const router = useRouter();

    // 2. Updated handleInputChange
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        const val = type === "checkbox" ? checked : value;

        setFormData((f) => ({ ...f, [name]: val }));
        // Clear error for this field on change
        if (errors[name]) {
            setErrors((prevErrors) => {
                const newErrors = { ...prevErrors };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    // 3. Enhanced Email Check
    const checkEmailExistsAndSetError = useCallback(async (emailToCheck?: string): Promise<string | null> => {
        const email = emailToCheck || formData.email;
        if (!email) return null;

        if (!/\S+@\S+\.\S+/.test(email)) {
            const errorMsg = "Invalid email format.";
            setErrors((e) => ({ ...e, email: errorMsg }));
            return errorMsg;
        }

        try {
            setErrors((e) => ({ ...e, email: "Checking..." }));
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'}/api/auth/check-email?email=${encodeURIComponent(email)}`
            );
            const data = await res.json();
            if (data.exists) {
                const errorMsg = "This email is already registered.";
                setErrors((e) => ({ ...e, email: errorMsg }));
                return errorMsg;
            } else {
                setErrors((e) => {
                    const newErrors = { ...e };
                    if (["This email is already registered.", "Invalid email format.", "Checking...", "Could not verify email. Please try again."].includes(newErrors.email)) {
                        delete newErrors.email;
                    }
                    return newErrors;
                });
                return null;
            }
        } catch (err) {
            console.error("Email check error:", err);
            const errorMsg = "Could not verify email. Please try again.";
            setErrors((e) => ({ ...e, email: errorMsg }));
            return errorMsg;
        }
    }, [formData.email]);

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        side: "front" | "back"
    ) => {
        const file = e.target.files?.[0];
        const fieldName = side === "front" ? "cnicFrontFile" : "cnicBackFile";

        if (file) {
            if (side === "front") {
                setCnicFrontFile(file);
            } else {
                setCnicBackFile(file);
            }
        } else {
            if (side === "front") {
                setCnicFrontFile(null);
            } else {
                setCnicBackFile(null);
            }
        }
        // Clear error for this field
        if (errors[fieldName]) {
            setErrors((prevErrors) => {
                const newErrors = { ...prevErrors };
                delete newErrors[fieldName];
                return newErrors;
            });
        }
    };

    // 5. Updated handleRegister
    const handleRegister = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            const payload = {
                ...formData,
                cnicImages: [cnicFrontFile?.name || "", cnicBackFile?.name || ""],
            };

            const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');
            const res = await fetch(`${API_BASE}/api/auth/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.msg || "Registration failed" };
            }

            localStorage.setItem("token", data.token);
            if (data.user.verificationURL) {
                setVerificationURL(data.user.verificationURL);
            }
            return { success: true };
        } catch (err: any) {
            console.error("Register error:", err.message);
            return { success: false, error: err.message || "An unknown registration error occurred." };
        }
    };

    const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
    const handleOtpChange = (value: string, idx: number) => {
        if (!/^\d*$/.test(value) || value.length > 1) return; // Allow empty or single digit
        const next = [...otp];
        next[idx] = value;
        setOtp(next);
        if (errors.otp) { // Clear OTP error on change
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.otp;
                return newErrors;
            });
        }
    };

    // 6. Updated handleVerify
    const handleApiVerify = async (): Promise<{ success: boolean; error?: string }> => {
        try {
            const code = otp.join("");
            const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');
            const res = await fetch(`${API_BASE}/api/auth/verify-email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: formData.email, code }),
            });
            const data = await res.json();
            if (!res.ok) {
                return { success: false, error: data.msg || "Verification failed" };
            }
            // ensure the user is logged in with full session after verification
            localStorage.setItem("token", data.token);

            // establish NextAuth session cookie so protected /seller routes skip login redirect
            await signIn("credentials", {
                redirect: false,
                email: formData.email,
                password: formData.password,
            });

            return { success: true };
        } catch (err: any) {
            const errorMessage = err instanceof Error ? err.message : "An unknown verification error occurred.";
            return { success: false, error: errorMessage };
        }
    };

    // --- Validation Functions per Step ---
    const validateStep0 = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = "Full name is required.";
        
        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = "Phone number is required.";
        } else if (!/^(\+92|0)?[0-9]{10}$/.test(formData.phoneNumber.replace(/[\s-]/g, ''))) {
            newErrors.phoneNumber = "Invalid phone number format.";
        }

        if (!formData.email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = "Invalid email format.";
        } else if (errors.email && ["This email is already registered.", "Could not verify email. Please try again.", "Checking..."].includes(errors.email)) {
            // Preserve async validation error if it's already set and relevant
            newErrors.email = errors.email;
        }

        if (!formData.password) {
            newErrors.password = "Password is required.";
        } else if (formData.password.length < 8) {
            newErrors.password = "Password must be at least 8 characters.";
        }
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Confirm password is required.";
        } else if (formData.password && formData.confirmPassword !== formData.password) {
            newErrors.confirmPassword = "Passwords do not match.";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0 && !newErrors.email?.includes("Checking..."); // Valid if no errors and not checking email
    };

    const handleNextStep0 = async () => {
        let emailValid = true;
        // Ensure email format is valid before async check
        if (formData.email.trim() && /\S+@\S+\.\S+/.test(formData.email)) {
            // If no current critical email error, perform the check
            if (!errors.email || !["This email is already registered.", "Could not verify email. Please try again."].includes(errors.email)) {
                const emailError = await checkEmailExistsAndSetError();
                if (emailError) emailValid = false;
            } else if (errors.email) { // If there's already a critical email error
                emailValid = false;
            }
        } else { // Handle cases where email is empty or format is initially wrong
            validateStep0(); // This will set errors for empty/format
            emailValid = false; // Set to false as basic email validation would fail
        }

        // Validate all fields (this will also pick up any email error set by checkEmailExistsAndSetError)
        const isStepFieldsValid = validateStep0();

        if (isStepFieldsValid && emailValid && (!errors.email || !errors.email.includes("Checking..."))) {
            setCurrentStep(1);
            setErrors({}); // Clear errors for the next step
        }
    };


    const validateStep1 = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.businessName.trim()) newErrors.businessName = "Business name is required.";
        if (!formData.businessType.trim()) newErrors.businessType = "Business type is required.";
        if (!formData.licenseNumber.trim()) newErrors.licenseNumber = "License number is required.";
        if (!formData.businessStreet.trim()) newErrors.businessStreet = "Business street is required.";
        if (!formData.businessCity.trim()) newErrors.businessCity = "Business city is required.";
        if (!formData.businessProvince.trim()) newErrors.businessProvince = "Business province is required.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep1 = () => {
        if (validateStep1()) {
            setCurrentStep(2);
            setErrors({});
        }
    };

    const validateStep2 = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.bankAccountNumber.trim()) newErrors.bankAccountNumber = "Bank account number is required.";
        // else if (!/^\d+$/.test(formData.bankAccountNumber)) newErrors.bankAccountNumber = "Must be numeric.";
        if (!formData.accountTitle.trim()) newErrors.accountTitle = "Account title is required.";
        if (!formData.branchCode.trim()) newErrors.branchCode = "Branch code is required.";
        // else if (!/^\d{4}$/.test(formData.branchCode)) newErrors.branchCode = "Must be a 4-digit code.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep2 = () => {
        if (validateStep2()) {
            setCurrentStep(3);
            setErrors({});
        }
    };

    const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
    const validateStep3 = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.cnic.trim()) {
            newErrors.cnic = "CNIC number is required.";
        } else if (!cnicRegex.test(formData.cnic)) {
            newErrors.cnic = "Invalid CNIC format (e.g., 42101-1234567-1).";
        }
        if (!cnicFrontFile) newErrors.cnicFrontFile = "CNIC front side image is required.";
        if (!cnicBackFile) newErrors.cnicBackFile = "CNIC back side image is required.";
        if (!formData.consent) newErrors.consent = "You must agree to the terms.";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep3 = async () => {
        if (validateStep3()) {
            const registrationResult = await handleRegister();
            if (registrationResult.success) {
                setCurrentStep(4);
                setErrors({});
            } else {
                setErrors({ general: registrationResult.error || "Registration failed. Please try again." });
            }
        }
    };

    const validateStep4 = () => { // For OTP
        const newErrors: Record<string, string> = {};
        const code = otp.join("");
        if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            newErrors.otp = "Please enter the complete 6-digit OTP.";
        }
        setErrors(newErrors); // Sets only OTP errors, preserves other errors if any (though should be none)
        return Object.keys(newErrors).length === 0;
    };

    const handleVerifyAndProceed = async () => {
        if (validateStep4()) {
            const verificationResult = await handleApiVerify();
            if (verificationResult.success) {
                setCurrentStep(5);
                setErrors({});
            } else {
                setErrors({ otp: verificationResult.error || "Verification failed. Please try again." });
            }
        }
    };

    return (
        <>
            <div className="min-h-screen bg-white py-10 px-4 md:px-8">
                {/* Stepper */}
                <div className="flex justify-center items-center gap-2 md:gap-4 mb-10 overflow-x-auto">
                    {[
                        "Personal Details", "Business Details", "Bank Details",
                        "National ID", "Verification", "Done",
                    ].map((label, index, arr) => (
                        <React.Fragment key={index}>
                            <div className="flex flex-col items-center min-w-[80px] text-center">
                                <div
                                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${index === currentStep
                                        ? "bg-[#FFA500] text-white border-[#FFA500]"
                                        : "bg-transparent text-[#FFA500] border-[#FFA500]"
                                        }`}
                                >
                                    {index + 1}
                                </div>
                                <span
                                    className={`text-[10px] md:text-xs mt-2 font-medium transition-colors ${index === currentStep ? "text-[#FFA500]" : "text-black"
                                        }`}
                                >
                                    {label}
                                </span>
                            </div>
                            {index !== arr.length - 1 && (
                                <div className="w-6 md:w-12 h-[2px] bg-orange-300"></div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* Step 0: Personal Details */}
                {currentStep === 0 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-2">REGISTER</h2>
                            <p className="text-gray-500 text-sm mb-6">AS A SELLER</p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Full name *</label>
                                <input
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    type="text"
                                    placeholder="Enter your name"
                                    name="name"
                                    className={`w-full px-4 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]`}
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Phone number *</label>
                                <input
                                    value={formData.phoneNumber}
                                    onChange={handleInputChange}
                                    type="tel"
                                    placeholder="03XX-XXXXXXX"
                                    name="phoneNumber"
                                    className={`w-full px-4 py-2 border ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]`}
                                />
                                {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Email *</label>
                                <input
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    name="email"
                                    type="email"
                                    onBlur={() => checkEmailExistsAndSetError()}
                                    placeholder="Enter your email"
                                    className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]`}
                                />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                            </div>

                            <div className="mb-4 relative">
                                <label className="block text-sm font-medium mb-1">Password *</label>
                                <input
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter password (min 8 characters)"
                                    className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]`}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9">
                                    {/* Eye SVGs */}
                                    {showPassword ? (<svg xmlns="http://www.w3.org/2000/svg" fill="#000000" viewBox="0 0 60.254 60.254" width="20px" height="20px"><path d="M29.008,48.308c-16.476,0-28.336-17.029-28.833-17.754c-0.248-0.36-0.231-0.841,0.039-1.184 c0.561-0.712,13.906-17.424,29.913-17.424c17.953,0,29.474,16.769,29.956,17.482c0.23,0.342,0.229,0.79-0.007,1.129 c-0.475,0.688-11.842,16.818-29.899,17.721C29.786,48.297,29.396,48.308,29.008,48.308z M2.267,30.028 c2.326,3.098,13.553,16.967,27.812,16.254c15.237-0.76,25.762-13.453,27.938-16.3c-2.175-2.912-12.811-16.035-27.889-16.035 C16.7,13.947,4.771,27.084,2.267,30.028z" /><path d="M30.127,37.114c-3.852,0-6.986-3.135-6.986-6.986c0-3.851,3.134-6.985,6.986-6.985s6.986,3.135,6.986,6.985 C37.113,33.979,33.979,37.114,30.127,37.114z" /><path d="M30.127,42.614c-6.885,0-12.486-5.602-12.486-12.486c0-6.883,5.602-12.485,12.486-12.485 c6.884,0,12.486,5.602,12.486,12.485C42.613,37.012,37.013,42.614,30.127,42.614z M30.127,19.641 c-5.782,0-10.486,4.704-10.486,10.486c0,5.781,4.704,10.485,10.486,10.485s10.486-4.704,10.486-10.485 C40.613,24.345,35.91,19.641,30.127,19.641z" /></svg>) :
                                        (<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none"><path d="M4.5 15.5C7.5 9 16.5 9 19.5 15.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.8162 12.1825L19.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 10.625V7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.18383 12.1825L4.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                                </button>
                                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                            </div>

                            <div className="mb-4 relative">
                                <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                                <input
                                    value={formData.confirmPassword} // Added value
                                    onChange={handleInputChange} // Added onChange
                                    name="confirmPassword" // Added name
                                    type={showConfirm ? "text" : "password"}
                                    placeholder="Re-enter password"
                                    className={`w-full px-4 py-2 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]`}
                                />
                                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-9">
                                    {/* Eye SVGs */}
                                    {showConfirm ? (<svg xmlns="http://www.w3.org/2000/svg" fill="#000000" viewBox="0 0 60.254 60.254" width="20px" height="20px"><path d="M29.008,48.308c-16.476,0-28.336-17.029-28.833-17.754c-0.248-0.36-0.231-0.841,0.039-1.184 c0.561-0.712,13.906-17.424,29.913-17.424c17.953,0,29.474,16.769,29.956,17.482c0.23,0.342,0.229,0.79-0.007,1.129 c-0.475,0.688-11.842,16.818-29.899,17.721C29.786,48.297,29.396,48.308,29.008,48.308z M2.267,30.028 c2.326,3.098,13.553,16.967,27.812,16.254c15.237-0.76,25.762-13.453,27.938-16.3c-2.175-2.912-12.811-16.035-27.889-16.035 C16.7,13.947,4.771,27.084,2.267,30.028z" /><path d="M30.127,37.114c-3.852,0-6.986-3.135-6.986-6.986c0-3.851,3.134-6.985,6.986-6.985s6.986,3.135,6.986,6.985 C37.113,33.979,33.979,37.114,30.127,37.114z" /><path d="M30.127,42.614c-6.885,0-12.486-5.602-12.486-12.486c0-6.883,5.602-12.485,12.486-12.485 c6.884,0,12.486,5.602,12.486,12.485C42.613,37.012,37.013,42.614,30.127,42.614z M30.127,19.641 c-5.782,0-10.486,4.704-10.486,10.486c0,5.781,4.704,10.485,10.486,10.485s10.486-4.704,10.486-10.485 C40.613,24.345,35.91,19.641,30.127,19.641z" /></svg>) :
                                        (<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none"><path d="M4.5 15.5C7.5 9 16.5 9 19.5 15.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.8162 12.1825L19.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 10.625V7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.18383 12.1825L4.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                                </button>
                                {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                            </div>
                            <button
                                disabled={
                                    !formData.name.trim() ||
                                    !formData.email.trim() ||
                                    !formData.password ||
                                    !formData.confirmPassword ||
                                    (errors.email === "Checking...") // Disable if email check is in progress
                                }
                                className="w-full bg-[#FFA500] text-white py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleNextStep0}
                            >
                                Next Step
                            </button>
                        </div>
                        <div className="hidden md:block">
                            <Image src="/images/sellerregister1.jpg" alt="Car" width={280} height={280} className="w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Step 1: Business Details */}
                {currentStep === 1 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-2">REGISTER</h2>
                            <p className="text-gray-500 text-sm mb-6">AS A SELLER</p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Business name *</label>
                                <input
                                    value={formData.businessName}
                                    onChange={handleInputChange}
                                    type="text"
                                    placeholder="Enter business name"
                                    name="businessName"
                                    className={`w-full px-4 py-2 border ${errors.businessName ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.businessName && <p className="text-red-500 text-xs mt-1">{errors.businessName}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Business type *</label>
                                <input
                                    value={formData.businessType}
                                    onChange={handleInputChange}
                                    name="businessType"
                                    type="text"
                                    placeholder="Retail / Workshop / Dealer"
                                    className={`w-full px-4 py-2 border ${errors.businessType ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.businessType && <p className="text-red-500 text-xs mt-1">{errors.businessType}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Business street *</label>
                                <input
                                    value={formData.businessStreet}
                                    onChange={handleInputChange}
                                    name="businessStreet"
                                    type="text"
                                    placeholder="Street / area"
                                    className={`w-full px-4 py-2 border ${errors.businessStreet ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.businessStreet && <p className="text-red-500 text-xs mt-1">{errors.businessStreet}</p>}
                            </div>

                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">City *</label>
                                    <input
                                        value={formData.businessCity}
                                        onChange={handleInputChange}
                                        name="businessCity"
                                        type="text"
                                        placeholder="City"
                                        className={`w-full px-4 py-2 border ${errors.businessCity ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                    />
                                    {errors.businessCity && <p className="text-red-500 text-xs mt-1">{errors.businessCity}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Province/State *</label>
                                    <input
                                        value={formData.businessProvince}
                                        onChange={handleInputChange}
                                        name="businessProvince"
                                        type="text"
                                        placeholder="Province"
                                        className={`w-full px-4 py-2 border ${errors.businessProvince ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                    />
                                    {errors.businessProvince && <p className="text-red-500 text-xs mt-1">{errors.businessProvince}</p>}
                                </div>
                            </div>

                            <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Postal code</label>
                                    <input
                                        value={formData.businessPostalCode}
                                        onChange={handleInputChange}
                                        name="businessPostalCode"
                                        type="text"
                                        placeholder="Postal code"
                                        className={`w-full px-4 py-2 border ${errors.businessPostalCode ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                    />
                                    {errors.businessPostalCode && <p className="text-red-500 text-xs mt-1">{errors.businessPostalCode}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Country</label>
                                    <input
                                        value={formData.businessCountry}
                                        onChange={handleInputChange}
                                        name="businessCountry"
                                        type="text"
                                        placeholder="Country"
                                        className={`w-full px-4 py-2 border ${errors.businessCountry ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                    />
                                    {errors.businessCountry && <p className="text-red-500 text-xs mt-1">{errors.businessCountry}</p>}
                                </div>
                            </div>

                            <div className="mb-4 relative">
                                <label className="block text-sm font-medium mb-1">Licence number *</label>
                                <input
                                    value={formData.licenseNumber}
                                    onChange={handleInputChange}
                                    name="licenseNumber"
                                    type={showLicense ? "text" : "password"}
                                    placeholder="Enter license number"
                                    className={`w-full px-4 py-2 border ${errors.licenseNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                <button type="button" onClick={() => setShowLicense(!showLicense)} className="absolute right-3 top-9">
                                    {/* Eye SVGs */}
                                    {showLicense ? (<svg xmlns="http://www.w3.org/2000/svg" fill="#000000" viewBox="0 0 60.254 60.254" width="20px" height="20px"><path d="M29.008,48.308c-16.476,0-28.336-17.029-28.833-17.754c-0.248-0.36-0.231-0.841,0.039-1.184 c0.561-0.712,13.906-17.424,29.913-17.424c17.953,0,29.474,16.769,29.956,17.482c0.23,0.342,0.229,0.79-0.007,1.129 c-0.475,0.688-11.842,16.818-29.899,17.721C29.786,48.297,29.396,48.308,29.008,48.308z M2.267,30.028 c2.326,3.098,13.553,16.967,27.812,16.254c15.237-0.76,25.762-13.453,27.938-16.3c-2.175-2.912-12.811-16.035-27.889-16.035 C16.7,13.947,4.771,27.084,2.267,30.028z" /><path d="M30.127,37.114c-3.852,0-6.986-3.135-6.986-6.986c0-3.851,3.134-6.985,6.986-6.985s6.986,3.135,6.986,6.985 C37.113,33.979,33.979,37.114,30.127,37.114z" /><path d="M30.127,42.614c-6.885,0-12.486-5.602-12.486-12.486c0-6.883,5.602-12.485,12.486-12.485 c6.884,0,12.486,5.602,12.486,12.485C42.613,37.012,37.013,42.614,30.127,42.614z M30.127,19.641 c-5.782,0-10.486,4.704-10.486,10.486c0,5.781,4.704,10.485,10.486,10.485s10.486-4.704,10.486-10.485 C40.613,24.345,35.91,19.641,30.127,19.641z" /></svg>) :
                                        (<svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none"><path d="M4.5 15.5C7.5 9 16.5 9 19.5 15.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M16.8162 12.1825L19.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M12 10.625V7" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M7.18383 12.1825L4.5 8.5" stroke="#000000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>)}
                                </button>
                                {errors.licenseNumber && <p className="text-red-500 text-xs mt-1">{errors.licenseNumber}</p>}
                            </div>
                            <button
                                disabled={!formData.businessName.trim() || !formData.businessType.trim() || !formData.licenseNumber.trim() || !formData.businessStreet.trim() || !formData.businessCity.trim() || !formData.businessProvince.trim()}
                                className="w-full bg-[#FFA500] text-white py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleNextStep1}
                            >
                                Next Step
                            </button>
                            <button className="mt-2 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300" onClick={() => setCurrentStep(0)}>
                                Previous Step
                            </button>
                        </div>
                        <div className="hidden md:block">
                            <Image src="/images/sellerregister1.jpg" alt="Car" width={280} height={280} className="w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Step 2: Bank Details */}
                {currentStep === 2 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-2">REGISTER</h2>
                            <p className="text-gray-500 text-sm mb-6">AS A SELLER</p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Bank Account number *</label>
                                <input
                                    value={formData.bankAccountNumber}
                                    onChange={handleInputChange}
                                    name="bankAccountNumber"
                                    type="text" // Consider type="tel" for numeric keyboards on mobile
                                    placeholder="Enter bank account number"
                                    className={`w-full px-4 py-2 border ${errors.bankAccountNumber ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.bankAccountNumber && <p className="text-red-500 text-xs mt-1">{errors.bankAccountNumber}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Account title *</label>
                                <input
                                    value={formData.accountTitle}
                                    onChange={handleInputChange}
                                    name="accountTitle"
                                    type="text"
                                    placeholder="Enter account title"
                                    className={`w-full px-4 py-2 border ${errors.accountTitle ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.accountTitle && <p className="text-red-500 text-xs mt-1">{errors.accountTitle}</p>}
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">Branch code *</label>
                                <input
                                    value={formData.branchCode}
                                    onChange={handleInputChange}
                                    name="branchCode"
                                    type="text" // Consider type="tel"
                                    placeholder="Enter branch code"
                                    className={`w-full px-4 py-2 border ${errors.branchCode ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.branchCode && <p className="text-red-500 text-xs mt-1">{errors.branchCode}</p>}
                            </div>

                            <button
                                disabled={!formData.bankAccountNumber.trim() || !formData.accountTitle.trim() || !formData.branchCode.trim()}
                                className="w-full bg-[#FFA500] text-white py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleNextStep2}
                            >
                                Next Step
                            </button>
                            <button className="mt-2 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300" onClick={() => setCurrentStep(1)}>
                                Previous Step
                            </button>
                        </div>
                        <div className="hidden md:block">
                            <Image src="/images/sellerregister1.jpg" alt="Car" width={280} height={280} className="w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Step 3: National ID */}
                {currentStep === 3 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8">
                            <h2 className="text-2xl font-bold mb-2">REGISTER</h2>
                            <p className="text-gray-500 text-sm mb-6">AS A SELLER</p>

                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-1">CNIC Number *</label>
                                <input
                                    name="cnic"
                                    type="text"
                                    placeholder="e.g. 42101-1234567-1"
                                    value={formData.cnic}
                                    onChange={handleInputChange}
                                    className={`w-full px-4 py-2 border ${errors.cnic ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:border-[#FFA500]`}
                                />
                                {errors.cnic && <p className="text-red-500 text-xs mt-1">{errors.cnic}</p>}
                            </div>
                            <label className="block text-sm font-semibold mb-1">
                                Upload your National ID or passport for Verification *
                            </label>
                            {(errors.cnicFrontFile || errors.cnicBackFile) && <p className="text-red-500 text-xs mb-2">Both front and back side images are required.</p>}


                            <div className="flex gap-6 mb-6">
                                <label className={`flex flex-col items-center justify-center w-full py-10 border-2 border-dashed ${errors.cnicFrontFile ? 'border-red-500' : 'border-gray-300'} rounded-lg cursor-pointer text-sm text-gray-500 hover:border-[#FFA500] transition-colors`}>
                                    <input onChange={(e) => handleFileChange(e, "front")} type="file" accept="image/*" className="hidden" />
                                    <div className="text-3xl mb-2">📄</div>
                                    {cnicFrontFile ? cnicFrontFile.name : "Front side"}
                                </label>

                                <label className={`flex flex-col items-center justify-center w-full py-10 border-2 border-dashed ${errors.cnicBackFile ? 'border-red-500' : 'border-gray-300'} rounded-lg cursor-pointer text-sm text-gray-500 hover:border-[#FFA500] transition-colors`}>
                                    <input onChange={(e) => handleFileChange(e, "back")} type="file" accept="image/*" className="hidden" />
                                    <div className="text-3xl mb-2">📄</div>
                                    {cnicBackFile ? cnicBackFile.name : "Back side"}
                                </label>
                            </div>

                            <div className="mb-6 flex items-start gap-2">
                                <input
                                    checked={formData.consent}
                                    name="consent"
                                    id="consent-checkbox" // Added id for label association
                                    type="checkbox"
                                    onChange={handleInputChange}
                                    className="mt-1 accent-[#FFA500] text-white"
                                />
                                <label htmlFor="consent-checkbox" className="text-xs text-gray-600 cursor-pointer"> {/* Made label clickable */}
                                    Your personal data will be used to enhance your experience on this
                                    website, manage your account access, and fulfill other purposes outlined in our
                                    Privacy Policy.
                                </label>
                            </div>
                            {errors.consent && <p className="text-red-500 text-xs mt-1 mb-2">{errors.consent}</p>}
                            {errors.general && <p className="text-red-500 text-sm mb-4 text-center">{errors.general}</p>}


                            <button
                                disabled={!formData.cnic.trim() || !cnicFrontFile || !cnicBackFile || !formData.consent}
                                className="w-full bg-[#FFA500] text-white py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleNextStep3}
                            >
                                Next Step
                            </button>
                            <button className="mt-2 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300" onClick={() => setCurrentStep(2)}>
                                Previous Step
                            </button>
                        </div>
                        <div className="hidden md:block">
                            <Image src="/images/sellerregister1.jpg" alt="Car Image" width={280} height={280} className="w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Step 4: Verification */}
                {currentStep === 4 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8 flex flex-col items-center justify-center">
                            <h2 className="text-2xl font-bold mb-2 text-center">REGISTER</h2>
                            <p className="text-gray-500 text-sm mb-6 text-center">AS A SELLER</p>

                            <div className="text-4xl mb-4 text-[#FFA500]"> {/* SVG Color set via fill */}
                                <svg height="40px" width="40px" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" fill="currentColor">
                                    <path d="M510.746,110.361c-2.128-10.754-6.926-20.918-13.926-29.463c-1.422-1.794-2.909-3.39-4.535-5.009 c-12.454-12.52-29.778-19.701-47.531-19.701H67.244c-17.951,0-34.834,7-47.539,19.708c-1.608,1.604-3.099,3.216-4.575,5.067 c-6.97,8.509-11.747,18.659-13.824,29.428C0.438,114.62,0,119.002,0,123.435v265.137c0,9.224,1.874,18.206,5.589,26.745 c3.215,7.583,8.093,14.772,14.112,20.788c1.516,1.509,3.022,2.901,4.63,4.258c12.034,9.966,27.272,15.45,42.913,15.45h377.51 c15.742,0,30.965-5.505,42.967-15.56c1.604-1.298,3.091-2.661,4.578-4.148c5.818-5.812,10.442-12.49,13.766-19.854l0.438-1.05 c3.646-8.377,5.497-17.33,5.497-26.628V123.435C512,119.06,511.578,114.649,510.746,110.361z M34.823,99.104 c0.951-1.392,2.165-2.821,3.714-4.382c7.689-7.685,17.886-11.914,28.706-11.914h377.51c10.915,0,21.115,4.236,28.719,11.929 c1.313,1.327,2.567,2.8,3.661,4.272l2.887,3.88l-201.5,175.616c-6.212,5.446-14.21,8.443-22.523,8.443 c-8.231,0-16.222-2.99-22.508-8.436L32.19,102.939L34.823,99.104z M26.755,390.913c-0.109-0.722-0.134-1.524-0.134-2.341V128.925 l156.37,136.411L28.199,400.297L26.755,390.913z M464.899,423.84c-6.052,3.492-13.022,5.344-20.145,5.344H67.244 c-7.127,0-14.094-1.852-20.142-5.344l-6.328-3.668l159.936-139.379l17.528,15.246c10.514,9.128,23.922,14.16,37.761,14.16 c13.89,0,27.32-5.032,37.827-14.16l17.521-15.253L471.228,420.18L464.899,423.84z M485.372,388.572 c0,0.803-0.015,1.597-0.116,2.304l-1.386,9.472L329.012,265.409l156.36-136.418V388.572z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Email Verification</h3>
                            <p className="text-sm text-gray-600 text-center mb-6">
                                We have sent a code to your email: <br className="md:hidden" />
                                <strong>{formData.email}</strong>
                            </p>

                            <div className="flex justify-center gap-3 mb-2">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        type="text" // Changed to text to allow easier deletion and pasting
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => {
                                            handleOtpChange(e.target.value, i);
                                            // Auto-focus next input
                                            if (e.target.value && i < otp.length - 1) {
                                                const nextSibling = e.target.nextElementSibling as HTMLInputElement | null;
                                                nextSibling?.focus();
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            // Auto-focus previous input on backspace if current is empty
                                            if (e.key === 'Backspace' && !otp[i] && i > 0) {
                                                const prevSibling = e.currentTarget.previousElementSibling as HTMLInputElement | null;
                                                prevSibling?.focus();
                                            }
                                        }}
                                        className={`w-12 h-12 border ${errors.otp ? 'border-red-500' : 'border-gray-300'} rounded-md text-center text-lg focus:outline-none focus:border-[#FFA500]`}
                                    />
                                ))}
                            </div>
                            {errors.otp && <p className="text-red-500 text-xs mt-1 mb-4 text-center">{errors.otp}</p>}

                            {verificationURL && (
                                <Link target="_blank" href={verificationURL} className="text-sm text-[#FFA500] underline mb-4">
                                    Check Email for Verification Link (if code doesn&apos;t work)
                                </Link>
                            )}

                            <button
                                disabled={otp.join("").length !== 6}
                                className="w-full bg-[#FFA500] text-white py-2 rounded-md mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={handleVerifyAndProceed}
                            >
                                Verify
                            </button>

                            <p className="text-sm text-gray-600">
                                Didn&apos;t receive code?{" "}
                                <button className="text-[#FFA500] underline" onClick={() => {/* TODO: Resend Code Logic */ alert("Resend code functionality to be implemented.") }}>Resend</button>
                            </p>
                            <button className="mt-4 w-full bg-gray-200 text-gray-700 py-2 rounded-md hover:bg-gray-300" onClick={() => setCurrentStep(3)}>
                                Previous Step (Edit Details)
                            </button>
                        </div>
                        <div className="hidden md:block">
                            <Image src="/images/sellerregister1.jpg" alt="Car Image" width={280} height={280} className="w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Step 5: Done */}
                {currentStep === 5 && (
                    <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                        <div className="p-8 flex flex-col justify-center items-center text-center">
                            <div className=" mb-4 text-[#FFA500]"> {/* SVG Color */}
                                <svg width="100px" height="100px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.5 15.25C10.307 15.2353 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.8601 6.91133 11.7029 6.93756 11.55C6.96379 11.3971 7.03676 11.2562 7.14643 11.1465C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9114 7.86003 10.9332 7.99998 11L10.47 13.47L19 5.00004C19.1399 4.9332 19.2972 4.91139 19.45 4.93762C19.6029 4.96385 19.7439 5.03682 19.8535 5.14649C19.9632 5.25616 20.0362 5.39713 20.0624 5.54999C20.0886 5.70286 20.0668 5.86009 20 6.00004L11 15C10.8724 15.1455 10.6929 15.2353 10.5 15.25Z" fill="currentColor" />
                                    <path d="M12 21C10.3915 20.9974 8.813 20.5638 7.42891 19.7443C6.04481 18.9247 4.90566 17.7492 4.12999 16.34C3.54037 15.29 3.17596 14.1287 3.05999 12.93C2.87697 11.1721 3.2156 9.39921 4.03363 7.83249C4.85167 6.26578 6.1129 4.9746 7.65999 4.12003C8.71001 3.53041 9.87134 3.166 11.07 3.05003C12.2641 2.92157 13.4719 3.03725 14.62 3.39003C14.7224 3.4105 14.8195 3.45215 14.9049 3.51232C14.9903 3.57248 15.0622 3.64983 15.116 3.73941C15.1698 3.82898 15.2043 3.92881 15.2173 4.03249C15.2302 4.13616 15.2214 4.2414 15.1913 4.34146C15.1612 4.44152 15.1105 4.53419 15.0425 4.61352C14.9745 4.69286 14.8907 4.75712 14.7965 4.80217C14.7022 4.84723 14.5995 4.87209 14.4951 4.87516C14.3907 4.87824 14.2867 4.85946 14.19 4.82003C13.2186 4.52795 12.1987 4.43275 11.19 4.54003C10.193 4.64212 9.22694 4.94485 8.34999 5.43003C7.50512 5.89613 6.75813 6.52088 6.14999 7.27003C5.52385 8.03319 5.05628 8.91361 4.77467 9.85974C4.49307 10.8059 4.40308 11.7987 4.50999 12.78C4.61208 13.777 4.91482 14.7431 5.39999 15.62C5.86609 16.4649 6.49084 17.2119 7.23999 17.82C8.00315 18.4462 8.88357 18.9137 9.8297 19.1953C10.7758 19.4769 11.7686 19.5669 12.75 19.46C13.747 19.3579 14.713 19.0552 15.59 18.57C16.4349 18.1039 17.1818 17.4792 17.79 16.73C18.4161 15.9669 18.8837 15.0864 19.1653 14.1403C19.4469 13.1942 19.5369 12.2014 19.43 11.22C19.4201 11.1169 19.4307 11.0129 19.461 10.9139C19.4914 10.8149 19.5409 10.7228 19.6069 10.643C19.6728 10.5631 19.7538 10.497 19.8453 10.4485C19.9368 10.3999 20.0369 10.3699 20.14 10.36C20.2431 10.3502 20.3471 10.3607 20.4461 10.3911C20.5451 10.4214 20.6372 10.471 20.717 10.5369C20.7969 10.6028 20.863 10.6839 20.9115 10.7753C20.9601 10.8668 20.9901 10.9669 21 11.07C21.1821 12.829 20.842 14.6026 20.0221 16.1695C19.2022 17.7363 17.9389 19.0269 16.39 19.88C15.3288 20.4938 14.1495 20.8755 12.93 21C12.62 21 12.3 21 12 21Z" fill="currentColor" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Congratulations</h2>
                            <p className="text-lg font-medium mb-4">Registration successful!</p>
                            <p className="text-sm text-gray-600 mb-6">Choose how you want to start onboarding.</p>
                            <div className="w-full flex flex-col md:flex-row gap-3">
                                <Link
                                    href="/seller/onboarding/edit-store"
                                    className="flex-1 bg-white border border-[#FFA500] text-[#FFA500] py-2 rounded-md text-center hover:bg-orange-50"
                                >
                                    Set up store look
                                </Link>
                                <Link
                                    href="/seller/onboarding/add-products"
                                    className="flex-1 bg-[#FFA500] text-white py-2 rounded-md text-center hover:bg-orange-600"
                                >
                                    Add products first
                                </Link>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <Image
                                src="/images/sellerregister1.jpg"
                                alt="Car Image"
                                width={280} 
                                height={280} 
                                className="w-full object-cover"
                            />
                        </div>
                    </div>
                )}

                <div className="text-center mt-6">
                    <span className="text-sm text-gray-600">
                        Register As a{" "}
                        <Link href="/signup-buyer" className="text-[#FFA500] underline">
                            Buyer?
                        </Link>
                    </span>
                </div>
            </div>
            <Newsletter />
        </>
    );
};

export default SignupSellerPage;
