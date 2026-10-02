/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { ChangeEvent, useState, useRef, useEffect } from 'react'
import { toast } from "sonner";
import Image from "@/app/components/AppImage"

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
    UserData?: {
        name?: string;
        email?: string;
        phoneNumber?: string;
        profileImage?: string;
        address?: {
            country?: string;
            province?: string;
            city?: string;
            postalCode?: string;
            fullAddress?: string;
        };
    };
}

function Profile(props: Props) {
    const [isEditing, setIsEditing] = useState(false)
    const [fname, setFName] = useState("John")
    const [lname, setLName] = useState("Doe")
    const [phone, setPhone] = useState("+92 000 000 0000")
    const [email, setEmail] = useState("john.doe@example.com")
    const [country, setCountry] = useState("Pakistan")
    const [city, setCity] = useState("Faisalabad")
    const [postalcode, setPostalcode] = useState("38000")
    const [showPopup, setShowPopup] = useState(false)
    const [province, setProvince] = useState("Punjab")
    const [house, setHouse] = useState("123 Main St")
    const [profileImage, setProfileImage] = useState<string>("/images/profile-placeholder.png")
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const session = props.Session
    const user = props.UserData

    const token = session?.backendToken || session?.accessToken;
    const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
    
    useEffect(() => {
        if (!user) return
                const nameParts = String(user.name ?? "").split(" ")
                setFName(nameParts.shift() ?? "")
                setLName(nameParts.join(" ") ?? "")
                setEmail(user.email ?? "")
                // only set profileImage if backend provided one (avoid overwriting local preview)
                if (user.profileImage) setProfileImage(user.profileImage)
                setPhone(user.phoneNumber ?? "")
                if (user.address) {
                    setCountry(user.address.country ?? "")
                    setProvince(user.address.province ?? "")
                    setCity(user.address.city ?? "")
                    setPostalcode(user.address.postalCode ?? "")
                    setHouse(user.address.fullAddress ?? "")
                }
    }, [user])


    const handleFeaturedUpload = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
            toast.error("Please select a PNG/JPEG/WebP/GIF image");
            return;
        }

        const fd = new FormData();
        fd.append("image", file); // backend expects "image" field

        try {
            const token = (session as Session)?.backendToken || (session as Session)?.accessToken;
            const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "");
            const res = await fetch(`${API_BASE}/api/upload/image`, {
                method: "POST",
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                body: fd,
            });

            const json = await res.json().catch(() => null);
            if (!res.ok || !json?.success) {
                const msg = json?.message ?? json?.error ?? `Upload failed (${res.status})`;
                toast.error(msg);
                return;
            }

            // json.url should be an absolute frontend URL or a path; use it for immediate preview
            const returnedUrl = json.url as string;
            console.log("Image uploaded, URL:", returnedUrl);

            // set preview first (immediate UI update), then persist on Save Changes
            setProfileImage(returnedUrl);
            toast.success("Image uploaded");
        } catch (err) {
            console.error("Upload failed:", err);
            toast.error("Upload failed");
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleProfileUpdate = async () => {
        const userId = (session?.user as { _id?: string; id?: string } | undefined)?._id ?? (session?.user as { _id?: string; id?: string } | undefined)?.id ?? null
        if (!token || !userId) {
            toast.error("You must be signed in to update profile")
            return
        }

        const payload: Record<string, any> = {
            name: `${String(fname ?? "").trim()} ${String(lname ?? "").trim()}`.trim(),
            email: email ?? undefined,
            profileImage: profileImage ?? undefined,
            // include other fields if your backend supports them
            phoneNumber: phone ?? undefined,
            address: {
                country: country ?? undefined,
                province: province ?? undefined,
                city: city ?? undefined,
                postalCode: postalcode ?? undefined,
                fullAddress: house ?? undefined,
            }
        }

        // remove undefined keys
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

        try {
            const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                let errJson: any = null
                try { errJson = await res.json() } catch { }
                const msg = errJson?.message ?? errJson?.error ?? `Update failed (${res.status})`
                toast.error(msg)
                return
            }

            const data = await res.json().catch(() => null)
            const updatedUser = data?.user ?? null
            if (updatedUser) {
                const nameParts = String(updatedUser.name ?? "").split(" ")
                setFName(nameParts.shift() ?? "")
                setLName(nameParts.join(" ") ?? "")
                setEmail(updatedUser.email ?? email)
                setPhone(updatedUser.phoneNumber ?? phone)
                setProfileImage(updatedUser.profileImage ?? profileImage)
                if (updatedUser.address) {
                    setCountry(updatedUser.address.country ?? country)
                    setProvince(updatedUser.address.province ?? province)
                    setCity(updatedUser.address.city ?? city)
                    setPostalcode(updatedUser.address.postalCode ?? postalcode)
                    setHouse(updatedUser.address.fullAddress ?? house)
                }
            }
            toast.success("Profile updated")
            // minimal: force session/header refresh
            window.location.reload()
        } catch (err) {
            console.error("Profile update failed:", err)
            toast.error("Failed to update profile")
        }
    }

    return (
        <main className="w-[82.8%] p-6 bg-gray-100">
            <div className='flex items-center justify-between'>
                <h1 className="text-2xl font-bold text-black">
                    {isEditing ? 'Edit Profile' : 'Profile'}
                </h1>
                {!isEditing ? (
                    <button
                        type="button"
                        className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                        onClick={() => setIsEditing(true)}
                    >
                        Edit Profile
                    </button>
                ) : (
                    <div className='flex items-center gap-3'>
                        <button
                            type="button"
                            className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                            onClick={() => {
                                setIsEditing(false)
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                            onClick={() => setShowPopup(true)}
                        >
                            Save Changes
                        </button>
                    </div>
                )}
            </div>
            <div className="mt-6 bg-white rounded-lg shadow-md overflow-x-auto p-8">
                <form className="space-y-8">
                    {/* ✅ Store Picture Preview Section */}
                    <div className='grid grid-cols-10'>
                        {/* Featured Image Upload */}
                        <div className="col-span-2 flex flex-col items-start">
                            <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-[#FFA500] group ">
                                <Image
                                    width={1080}
                                    height={1080}
                                    src={previewImage ?? profileImage}
                                    alt="Featured"
                                    className="w-full h-full object-contain"
                                />
                                <div className="absolute inset-0 bg-[#00000095] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center space-y-1 transition-all duration-200">
                                    {isEditing ? (
                                        <button
                                            type="button"
                                            className="text-white text-xs font-bold cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            Change Image
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                setPreviewImage(profileImage)
                                            }}
                                            className="text-white text-xs font-bold cursor-pointer"
                                        >
                                            View Image
                                        </button>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFeaturedUpload}
                                    ref={fileInputRef}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        <div className='col-span-8 flex flex-col justify-between'>
                            {/* ✅ Row 1 - First Name & Last Name */}
                            <div className="grid grid-cols-1 md:grid-cols-2  gap-6">
                                {['fname', 'lname'].map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-medium mb-1">
                                            {field === 'fname' ? 'First Name' : 'Last Name'}
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={field === 'fname' ? fname : lname}
                                                onChange={(e) =>
                                                    field === 'fname'
                                                        ? setFName(e.target.value)
                                                        : setLName(e.target.value)
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                            />
                                        ) : (
                                            <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                                                <span>{field === 'fname' ? fname : lname}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* ✅ Row 2 - Phone & Email */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['phone', 'email'].map((field) => (
                                    <div key={field}>
                                        <label className="block text-sm font-medium mb-1">
                                            {field === 'phone' ? 'Phone Number' : 'Email Address'}
                                        </label>
                                        {isEditing ? (
                                            <input
                                                type={field === 'phone' ? 'text' : 'email'}
                                                value={field === 'phone' ? phone : email}
                                                onChange={(e) =>
                                                    field === 'phone' ? setPhone(e.target.value) : setEmail(e.target.value)
                                                }
                                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                            />
                                        ) : (
                                            <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                                                <span>{field === 'phone' ? phone : email}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* ✅ Row 3 - Country & Province */}
                    <div className="grid grid-cols-1 md:grid-cols-2 mt-6 gap-6">
                        {['country', 'province'].map((field) => (
                            <div key={field}>
                                <label className="block text-sm font-medium mb-1">
                                    {field === 'country' ? 'Country' : 'Province'}
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={field === 'country' ? country : province}
                                        onChange={(e) =>
                                            field === 'country'
                                                ? setCountry(e.target.value)
                                                : setProvince(e.target.value)
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                    />
                                ) : (
                                    <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                                        <span>{field === 'country' ? country : province}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ✅ Row 4 - City & Postal Code */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {['city', 'postalcode'].map((field) => (
                            <div key={field}>
                                <label className="block text-sm font-medium mb-1">
                                    {field === 'city' ? 'City' : 'Postalcode'}
                                </label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={field === 'city' ? city : postalcode}
                                        onChange={(e) =>
                                            field === 'city' ? setCity(e.target.value) : setPostalcode(e.target.value)
                                        }
                                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                    />
                                ) : (
                                    <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                                        <span>{field === 'city' ? city : postalcode}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ✅ Row 5 - Full Address (House) */}
                    <div className="w-full">
                        <label className="block text-sm font-medium mb-1">Full Address</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={house}
                                onChange={(e) => setHouse(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                            />
                        ) : (
                            <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                                <span>{house}</span>
                            </div>
                        )}
                    </div>
                </form>
            </div>

            {previewImage && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1999]"
                    onClick={() => setPreviewImage(null)} // Close on background click
                >
                    <div onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-[23px] text-white z-10"
                            aria-label="Close Preview"
                        >
                            <svg width="35" height="35" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#ffffff"></path>
                            </svg>
                        </button>
                        <Image
                            width={1080}
                            height={1080}
                            src={previewImage}
                            alt="Store Preview Large"
                            className=" max-h-[80vh] w-[1080px] h-[1080px] object-contain rounded-lg shadow-lg "
                        />

                    </div>
                </div>
            )}

            {/* ✅ Confirmation Popup */}
            {showPopup && (
                <div className="fixed inset-0 flex items-center justify-center bg-[#00000090] z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <h2 className="text-m mb-6 text-black">Are you sure you want to save the changes?</h2>
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
                                    setIsEditing(false)
                                    handleProfileUpdate()
                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Profile
