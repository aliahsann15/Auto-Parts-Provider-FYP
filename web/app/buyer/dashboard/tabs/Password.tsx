/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react'
import { toast } from 'sonner'
import {
    FiEyeOff,
    FiEye
} from 'react-icons/fi'

type Session = {
        backendToken?: string;
        accessToken?: string;
        user?: {
            _id?: string;
            id?: string;
        };
    };
interface Props {
    Session: Session | null
}

function Password(props: Props) {

    const [showPassword, setShowPassword] = useState(false)
    const [oldPassword, setOldPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPopup, setShowPopup] = useState(false)
    const [showVerifyPopup, setShowVerifyPopup] = useState(false)
    const session = props.Session


    const token = session?.backendToken || session?.accessToken;
    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
    const userId = (session?.user as { _id?: string; id?: string } | undefined)?._id ?? (session?.user as { _id?: string; id?: string } | undefined)?.id ?? null

    const handleChangePassword = async (oldPassword: string, newPassword: string) => {
        if (!token || !userId) {
            toast.error("You must be signed in to change password")
            return
        }
        try {
            const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}/change-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ oldPassword, newPassword }),
            })

            if (!res.ok) {
                let errJson: any = null
                try { errJson = await res.json() } catch { }
                const msg = errJson?.message ?? errJson?.error ?? `Change password failed (${res.status})`
                toast.error(msg)
                return
            }
            setOldPassword("")
            setNewPassword("")
            setConfirmPassword("")
            toast.success("Password changed successfully")
        } catch (err) {
            console.error("Change password failed:", err)
            toast.error("Failed to change password. Try Later")
        }
    }


    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            <h1 className="text-2xl font-bold text-black">Change Password</h1>
            <div className="mt-6 bg-white rounded-lg shadow-md overflow-x-auto p-8">
                <form className="space-y-6">

                    {/* ✅ Change Password (Always Editable) */}
                    <label htmlFor="oldPassword" className="block text-sm font-medium mb-2">Old Password</label>
                    {/* ✅ Row 1 - Old Password */}
                    <div className="flex flex-col justify-start items-start sm:flex-col gap-2">
                        <div className='w-full relative'>
                            <input
                                id="oldPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter old password"
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                className="w-full pl-4 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                required
                            />
                            {showPassword ? (
                                <FiEye
                                    className="absolute right-3 top-3 cursor-pointer"
                                    onClick={() => setShowPassword(false)}
                                />
                            ) : (
                                <FiEyeOff
                                    className="absolute right-3 top-3 z-30 cursor-pointer"
                                    onClick={() => setShowPassword(true)}
                                />
                            )}
                        </div>
                        <button
                            type="button"
                            className="text-[#FFA500] text-sm underline"
                            onClick={() => setShowVerifyPopup(true)}
                        >
                            Forgot Password?
                        </button>
                    </div>
                    {/* ✅ Row 2 - New Password and Confirm Password */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor='newPassword' className="block text-sm font-medium mb-2">New Password</label>
                            <input
                                id="newPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                            />
                        </div>
                        <div>
                            <label htmlFor='confirmPassword' className="block text-sm font-medium mb-2">Confirm Password</label>
                            <input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                placeholder="Confirm new password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                required
                            />
                        </div>
                    </div>

                    {/* ✅ Action Buttons */}
                    <div className="flex justify-end gap-4 pt-4">
                        <button
                            type="button"
                            className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                            onClick={() => setShowPopup(true)}
                        >
                            Change Password
                        </button>
                    </div>
                </form>
            </div>

            {/* ✅ Confirmation Popup */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-[#00000090] z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-m mb-6 text-black">Are you sure you want to change your password?</h2>
                        <div className="flex justify-end gap-4">
                            <button
                                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                                onClick={() => {
                                    setShowPopup(false)
                                }}
                            >
                                No
                            </button>
                            <button
                                className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                                onClick={() => {
                                    setShowPopup(false)
                                    // You can add submit logic here
                                    if (newPassword === confirmPassword) {
                                        handleChangePassword(oldPassword, newPassword)
                                    } else {
                                        toast.error("Passwords do not match");
                                    }

                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVerifyPopup && (
                <div className="fixed inset-0 bg-[#00000095] flex items-center justify-center z-[9999]">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full relative">
                        <button
                            onClick={() => setShowVerifyPopup(false)}
                            className="absolute top-5 right-[20px] text-white z-[99999999]"
                            aria-label="Close Preview"
                        >
                            <svg width="30" height="30" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#000000"></path></svg>
                        </button>
                        <div className="text-4xl mb-4 flex justify-center">
                            <svg height="40px" width="40px" viewBox="0 0 512 512" fill="#FFA500" xmlns="http://www.w3.org/2000/svg">
                                <path d="M510.746,110.361c...Z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2 text-center">Email Verification</h3>
                        <p className="text-sm text-gray-600 text-center mb-6">
                            We have sent a code to your Email.
                        </p>
                        <div className="flex justify-center gap-3 mb-6">
                            {[1, 2, 3, 4].map((_, i) => (
                                <input
                                    key={i}
                                    type="text"
                                    maxLength={1}
                                    className="w-12 h-12 border border-gray-300 rounded-md text-center text-lg focus:outline-none focus:border-[#FFA500] focus:border-2"
                                    onKeyUp={(e) => {
                                        if (e.key !== 'Backspace' && e.currentTarget.value.length === 1) {
                                            const next = document.getElementById(`otp-${i + 1}`)
                                            if (next) next.focus()
                                        } else if (e.key === 'Backspace' && e.currentTarget.value === '') {
                                            const prev = document.getElementById(`otp-${i - 1}`)
                                            if (prev) prev.focus()
                                        }
                                    }}
                                    id={`otp-${i}`}
                                />
                            ))}
                        </div>
                        <button
                            className="w-full bg-[#FFA500] text-white py-2 rounded-md mb-4"
                            onClick={() => setShowVerifyPopup(false)}
                        >
                            Verify
                        </button>
                        <p className="text-sm text-gray-600 text-center">
                            Didn&apos;t receive code? <button className="text-[#FFA500] underline">Resend</button>
                        </p>
                    </div>
                </div>
            )}

        </main>
    )
}

export default Password