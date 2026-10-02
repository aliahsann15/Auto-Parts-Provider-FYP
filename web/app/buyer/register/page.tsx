"use client";

import { Fragment, useState } from "react";
import Image from "@/app/components/AppImage";
import Newsletter from "@/app/components/newsletter/newsletter";
import { signIn } from "next-auth/react";
import { FcGoogle } from "react-icons/fc";

interface FormData {
  name: string
  phoneNumber: string
  email: string
  password: string
  confirmPassword: string
  consent: boolean
  interests: string[]
}

interface Interest {
  src: string,
  name: string
}

const buyerInterestsData: Interest[] = [
  { src: "/images/interest1.jpg", name: "BMW" },
  { src: "/images/interests2-min.png", name: "Tesla" },
  { src: "/images/interests3-min.png", name: "Ford" },
  { src: "/images/interests4-min.png", name: "Porsche" },
  { src: "/images/interests5-min.png", name: "Bentley" },
  { src: "/images/interests6.png", name: "Nissan" },
  { src: "/images/interests7-min.png", name: "Lexus" },
  { src: "/images/interests8-min.png", name: "Volkswagen" },
  { src: "/images/interest9-min.png", name: "Mercedes Benz" },
];

const SignupBuyer = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    consent: false,
    interests: [],
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const [isRegistering, setIsRegistering] = useState(false);



  const checkEmailExists = async () => {
    if (!formData.email) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'}/api/auth/check-email?email=${encodeURIComponent(formData.email)}`
      );
      const data = await res.json();
      if (data.exists) {
        setErrors((e) => ({ ...e, email: "This email is already registered" }));
      } else {
        setErrors((e) => ({ ...e, email: "" }));
      }
    } catch {
      setErrors((e) => ({ ...e, email: "Error checking email" }));
    }
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prevErrors) => {
      const newErrors = { ...prevErrors };
      delete newErrors[name];
      return newErrors;
    });
  };

  const handleInterestChange = (name: string) => {
    setFormData((prevData) => {
      const newInterests = prevData.interests.includes(name)
        ? prevData.interests.filter((i) => i !== name)
        : [...prevData.interests, name];
      return { ...prevData, interests: newInterests };
    });
  };

  const validateStep1 = async () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      newErrors.name = "Full name is required";
    }
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    } else {
      // Check if the email exists on the server
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'}/api/auth/check-email?email=${encodeURIComponent(formData.email)}`
        );
        const data = await res.json();
        if (data.exists) {
          newErrors.email = "This email is already registered";
        }
      } catch {
        newErrors.email = "Error checking email";
      }
    }

    if (!newErrors.email) {
      if (!formData.password) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 6) {
        newErrors.password = "Password must be at least 6 characters";
      }
      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Confirm password is required";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    if (!formData.consent) {
      newErrors.consent = "Please agree to the privacy policy";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    if (formData.interests.length === 0) {
      setErrors((prevErrors) => ({
        ...prevErrors,
        interests: "Please select at least one interest",
      }));
      return false;
    }
    setErrors((prevErrors) => ({ ...prevErrors, interests: "" }));
    return true;
  };


  const goToNextStep = async () => {
    const isValid = await validateStep1();
    if (isValid) {
      setCurrentStep((prevStep) => prevStep + 1);
    }
  };

  const handleSubmit = async () => {
    if (validateStep2()) {
      setIsRegistering(true);
      try {
        const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '');
        const res = await fetch(`${API_BASE}/api/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...formData, role: "Buyer" }), // Ensure role is "Buyer"
        });
        const data = await res.json();

        if (res.ok) {
          // Registration successful, you might want to redirect or show a success message
          // console.log("Buyer registered successfully:", data);
          setCurrentStep(2); // Proceed to the "Done" step
          // TODO: Instead of storing it in the localstorage, store in the http-only cookie
          localStorage.setItem("token", data.token);
        } else {
          // Registration failed, display the error message
          // console.error("Buyer registration failed:", data.msg || "Something went wrong");
          setErrors((prevErrors) => ({ ...prevErrors, general: data.msg || "Something went wrong" }));
          // Optionally display a general error message to the user
        }
      } catch {
        // console.error("Error during buyer registration:", error);
        setErrors((prevErrors) => ({ ...prevErrors, general: "An unexpected error occurred" }));
        // Optionally display a general error message to the user
      } finally {
        setIsRegistering(false)
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setIsRegistering(true);
    setErrors({});
    // No redirect: false here initially, let NextAuth handle it or specify callbackUrl
    // The callbackUrl in pages config or here will be used after successful Google Sign-In.
    const result = await signIn("google", {
      callbackUrl: "/", // Where to redirect after successful Google sign-in
      // redirect: false, // If you want to handle redirect manually after checking result
    });

    // If redirect: false was used:
    if (result?.error) {
      console.error("Google Sign-In Error:", result.error);
      setErrors((e) => ({ ...e, email: "Error signing in with email" }));
    } else if (result?.ok) {
      // router.push("/"); // Manually redirect if redirect: false
      console.log("Google Sign-In process initiated or successful (if redirect:false).");
    }
    setIsRegistering(false);
  };

  const canProceedStep1 =
    formData.name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(formData.email) &&
    formData.password.length >= 6 &&
    formData.password === formData.confirmPassword &&
    formData.consent &&
    // optionally make sure email-check didn’t leave an error
    !errors.email;

  const canProceedStep2 = formData.interests.length > 0;



  return (
    <>
      <div className="min-h-screen bg-white py-10 px-4 md:px-8">
        <div className="flex justify-center items-center gap-2 md:gap-4 mb-10 overflow-x-auto">
          {["Personal Details", "Interests", "Done"].map((label, index, arr) => {
            const isActive = index === currentStep;
            return (
              <Fragment key={index}>
                <div className="flex flex-col items-center min-w-[80px] text-center">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm transition-all duration-300 ${isActive
                      ? "bg-[#FFA500] text-white border-[#FFA500]"
                      : "bg-transparent text-[#FFA500] border-[#FFA500]"
                      }`}
                  >
                    {index + 1}
                  </div>
                  <span
                    className={`text-[10px] md:text-xs mt-2 font-medium transition-colors ${isActive ? "text-[#FFA500]" : "text-black"
                      }`}
                  >
                    {label}
                  </span>
                </div>
                {index !== arr.length - 1 && (
                  <div className="w-6 md:w-12 h-[2px] bg-orange-300"></div>
                )}
              </Fragment>
            );
          })}
        </div>

        {/* ✅ Step 1: Personal Details */}
        {currentStep === 0 && (
          <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-2">REGISTER</h2>
              <p className="text-gray-500 text-sm mb-6">AS A BUYER</p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Full name *</label>
                <input
                  type="text"
                  placeholder="Enter your name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${errors.name ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]`}
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="Enter your phone number"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${errors.phoneNumber ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]`}
                />
                {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  onBlur={checkEmailExists}
                  type="email"
                  placeholder="Enter your email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${errors.email ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${errors.password ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]`}
                />
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#000000"
                      viewBox="0 0 60.254 60.254"
                      width="20px"
                      height="20px"
                    >
                      <path d="M29.008,48.308c-16.476,0-28.336-17.029-28.833-17.754..." />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M4.5 15.5C7.5 9 16.5 9 19.5 15.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16.8162 12.1825L19.5 8.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 10.625V7"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.18383 12.1825L4.5 8.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1">Confirm Password *</label>
                <input
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2 border ${errors.confirmPassword ? "border-red-500" : "border-gray-300"
                    } rounded-md focus:outline-none focus:border-[2px] focus:border-[#FFA500]`}
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-9"
                >
                  {showConfirm ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="#000000"
                      viewBox="0 0 60.254 60.254"
                      width="20px"
                      height="20px"
                    >
                      <path d="M29.008,48.308c-16.476,0-28.336-17.029-28.833-17.754..." />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20px"
                      height="20px"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M4.5 15.5C7.5 9 16.5 9 19.5 15.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M16.8162 12.1825L19.5 8.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 10.625V7"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7.18383 12.1825L4.5 8.5"
                        stroke="#000000"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </div>

              <div className="mb-6 flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1 accent-[#FFA500] text-white"
                  name="consent"
                  checked={formData.consent}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-600">
                  Your personal data will be used to enhance your experience on this
                  website, manage your account access, and fulfill other purposes outlined in our
                  Privacy Policy.
                </p>
              </div>
              {errors.consent && <p className="text-red-500 text-xs mt-1">{errors.consent}</p>}
              <button
                onClick={goToNextStep}
                disabled={!canProceedStep1}
                className={`w-full py-2 rounded-md text-white ${canProceedStep1 ? "bg-[#FFA500] hover:opacity-90" : "bg-[#FFA500] opacity-50 cursor-not-allowed"}`}
              >
                Next Step
              </button>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="mt-4 cursor-pointer w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-100 disabled:opacity-50"
                disabled={isRegistering}
              >
                <FcGoogle className="w-5 h-5 mr-2" />
                {isRegistering ? "Processing..." : "Sign in with Google"}
              </button>
            </div>

            <div className="hidden md:block">
              <Image
                src="/images/sellerregister1.jpg"
                alt="Car Image"
                width={545}
                height={600}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* ✅ Step 2: Interests */}
        {currentStep === 1 && (
          <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <h2 className="text-2xl font-bold mb-2">CHOOSE INTEREST</h2>
              <p className="text-gray-500 text-sm mb-6">Choose one or more</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                {buyerInterestsData.map((interest, i) => (
                  <label
                    key={i}
                    className={`relative cursor-pointer w-[80px] h-[80px] rounded-full overflow-hidden border border-gray-300 hover:border-[#FFA500] transition-all ${formData.interests.includes(interest.name) ? "border-[#FFA500]" : ""
                      }`}
                  >
                    <input
                      type="checkbox"
                      className="peer hidden"
                      value={interest.name}
                      checked={formData.interests.includes(interest.name)}
                      onChange={() => handleInterestChange(interest.name)}
                    />
                    <Image
                      src={interest.src}
                      width={100}
                      height={100}
                      alt={`Interest ${i + 1}: ${interest.name}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[#FFA500] bg-opacity-10 hidden peer-checked:flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="white"
                        viewBox="0 0 24 24"
                        width="30"
                        height="30"
                      >
                        <path d="M20.285 6.709l-11.01 11.01-5.303-5.304 1.414-1.414 3.889 3.889 9.596-9.596z" />
                      </svg>
                    </div>
                  </label>
                ))}
              </div>
              {errors.interests && (
                <p className="text-red-500 text-xs mt-1">{errors.interests}</p>
              )}

              <button
                onClick={handleSubmit}
                className={`cursor-pointer
                  w-full py-2 rounded-md text-white
                  ${canProceedStep2 && !isRegistering
                    ? "bg-[#FFA500] hover:opacity-90"
                    : "bg-[#FFA500] opacity-50 cursor-not-allowed"
                  }
                `}
              >
               {!isRegistering ? "Choose" : "Signing you up..."}
              </button>
              <button
              disabled={canProceedStep2}
                onClick={() => setCurrentStep(0)}
                className="w-full py-2 rounded-md text-[#FFA500] hover:opacity-90"
              >
                Go Back
              </button>
            </div>

            <div className="hidden md:block">
              <img
                src="/images/sellerregister1.jpg"
                alt="Car Image"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* ✅ Step 3: Done */}
        {currentStep === 2 && (
          <div className="max-w-[1090px] mx-auto grid grid-cols-1 md:grid-cols-2 bg-white shadow-[0_0_10px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
            {/* ✅ Left Side: Congratulations Text */}
            <div className="p-8 flex flex-col justify-center items-center text-center">
              <h2 className="text-2xl font-bold mb-1">REGISTER</h2>
              <p className="text-gray-500 text-sm mb-6">AS A BUYER</p>

              {/* ✅ Success Icon */}
              <svg
                width="100px"
                height="100px"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10.5 15.25C10.307 15.2353 10.1276 15.1455 9.99998 15L6.99998 12C6.93314 11.8601 6.91133 11.7029 6.93756 11.55C6.96379 11.3971 7.03676 11.2562 7.14643 11.1465C7.2561 11.0368 7.39707 10.9638 7.54993 10.9376C7.70279 10.9114 7.86003 10.9332 7.99998 11L10.47 13.47L19 5.00004C19.1399 4.9332 19.2972 4.91139 19.45 4.93762C19.6029 4.96385 19.7439 5.03682 19.8535 5.14649C19.9632 5.25616 20.0362 5.39713 20.0624 5.54999C20.0886 5.70286 20.0668 5.86009 20 6.00004L11 15C10.8724 15.1455 10.6929 15.2353 10.5 15.25Z"
                  fill="#FFA500"
                />
                <path
                  d="M12 21C10.3915 20.9974 8.813 20.5638 7.42891 19.7443C6.04481 18.9247 4.90566 17.7492 4.12999 16.34C3.54037 15.29 3.17596 14.1287 3.05999 12.93C2.87697 11.1721 3.2156 9.39921 4.03363 7.83249C4.85167 6.26578 6.1129 4.9746 7.65999 4.12003C8.71001 3.53041 9.87134 3.166 11.07 3.05003C12.2641 2.92157 13.4719 3.03725 14.62 3.39003C14.7224 3.4105 14.8195 3.45215 14.9049 3.51232C14.9903 3.57248 15.0622 3.64983 15.116 3.73941C15.1698 3.82898 15.2043 3.92881 15.2173 4.03249C15.2302 4.13616 15.2214 4.2414 15.1913 4.34146C15.1612 4.44152 15.1105 4.53419 15.0425 4.61352C14.9745 4.69286 14.8907 4.75712 14.7965 4.80217C14.7022 4.84723 14.5995 4.87209 14.4951 4.87516C14.3907 4.87824 14.2867 4.85946 14.19 4.82003C13.2186 4.52795 12.1987 4.43275 11.19 4.54003C10.193 4.64212 9.22694 4.94485 8.34999 5.43003C7.50512 5.89613 6.75813 6.52088 6.14999 7.27003C5.52385 8.03319 5.05628 8.91361 4.77467 9.85974C4.49307 10.8059 4.40308 11.7987 4.50999 12.78C4.61208 13.777 4.91482 14.7431 5.39999 15.62C5.86609 16.4649 6.49084 17.2119 7.23999 17.82C8.00315 18.4462 8.88357 18.9137 9.8297 19.1953C10.7758 19.4769 11.7686 19.5669 12.75 19.46C13.747 19.3579 14.713 19.0552 15.59 18.57C16.4349 18.1039 17.1818 17.4792 17.79 16.73C18.4161 15.9669 18.8837 15.0864 19.1653 14.1403C19.4469 13.1942 19.5369 12.2014 19.43 11.22C19.4201 11.1169 19.4307 11.0129 19.461 10.9139C19.4914 10.8149 19.5409 10.7228 19.6069 10.643C19.6728 10.5631 19.7538 10.497 19.8453 10.4485C19.9368 10.3999 20.0369 10.3699 20.14 10.36C20.2431 10.3502 20.3471 10.3607 20.4461 10.3911C20.5451 10.4214 20.6372 10.471 20.717 10.5369C20.7969 10.6028 20.863 10.6839 20.9115 10.7753C20.9601 10.8668 20.9901 10.9669 21 11.07C21.1821 12.829 20.842 14.6026 20.0221 16.1695C19.2022 17.7363 17.9389 19.0269 16.39 19.88C15.3288 20.4938 14.1495 20.8755 12.93 21C12.62 21 12.3 21 12 21Z"
                  fill="#FFA500"
                />
              </svg>

              {/* ✅ Success Text */}
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                Congratulations <br /> Registered Successfully!
              </h3>

              <p className="text-sm text-gray-600 mb-6">Click here to Login</p>

              {/* ✅ Login Button */}
              <a
                href="/login"
                className="w-full max-w-[250px] bg-[#FFA500]  text-white text-sm font-semibold py-2 rounded-md"
              >
                Login
              </a>
            </div>

            {/* ✅ Right Side: Image */}
            <div className="hidden md:block">
              <img
                src="/images/sellerregister1.jpg"
                alt="Car Image"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="text-center mt-6">
          <span className="text-sm text-gray-600">
            Register As a{" "}
            <a href="/seller/register" className="text-[#FFA500] underline">
              Seller?
            </a>
          </span>
        </div>
      </div>

      <Newsletter />
    </>
  );
};

export default SignupBuyer;
