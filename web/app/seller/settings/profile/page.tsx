// Seller Profile Update Page
'use client'

import React, { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react'
import Image from '@/app/components/AppImage'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'

const UpdateProfile = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: session } = useSession()

  const [isEditing, setIsEditing] = useState(false)
  const [storeName, setStoreName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [storeImage, setStoreImage] = useState<string>('')
  const [storeImageFile, setStoreImageFile] = useState<File | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [cnic, setCnic] = useState('')
  const [businessCity, setBusinessCity] = useState('')
  const [businessAddress, setBusinessAddress] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPopup, setShowPopup] = useState(false)
  const [showVerifyPopup, setShowVerifyPopup] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPasswordSaving, setIsPasswordSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const getToken = useCallback(() => (session as any)?.backendToken || (session as any)?.accessToken, [session])
  // For StoreManagers, use their assigned sellerId; for Sellers, use their own ID
  const userId = (session as any)?.user?.sellerId || (session as any)?.user?.id || (session as any)?.user?._id
  const userRole = (session?.user as any)?.role?.toLowerCase() || ''
  const isStoreManager = userRole === 'storemanager'

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return
      const token = getToken()
      if (!token) return
      setIsLoading(true)
      try {
        const profileRes = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        const storeRes = await fetch(`${API_BASE}/api/store/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        if (!profileRes.ok || !storeRes.ok) throw new Error('Failed to load profile')

        const profileData = await profileRes.json()
        const u = profileData.user || {}
        setOwnerName(u.name || '')
        setPhone(u.phoneNumber || '')
        setEmail(u.email || '')
        setBusinessName(u.businessName || '')
        setBusinessType(u.businessType || '')
        setLicenseNumber(u.licenseNumber || '')
        setCnic(u.cnic || '')

        const storeData = await storeRes.json()
        const s = storeData.store || {}
        setStoreName(s.storeName || '')
        setStoreImage(s.storeProfileImage || '')
        const primaryAddress = Array.isArray(s.addresses) && s.addresses.length > 0 ? s.addresses[0] : {}
        setBusinessCity(primaryAddress.city || '')
        setBusinessAddress(primaryAddress.fullAddress || primaryAddress.street || '')
      } catch (error) {
        console.error(error)
        toast.error(error instanceof Error ? error.message : 'Unable to load profile')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [userId, getToken])

  const uploadImage = async (file: File): Promise<string> => {
    const token = getToken()
    if (!token) throw new Error('Not authenticated')
    const formData = new FormData()
    formData.append('image', file)
    formData.append('folderName', 'store-logos')
    const res = await fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })
    if (!res.ok) throw new Error('Image upload failed')
    const data = await res.json()
    return data.url
  }

  const handleFeaturedUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setStoreImageFile(file)
      setStoreImage(URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    if (!userId) {
      toast.error('User not found')
      return
    }
    const token = getToken()
    if (!token) {
      toast.error('Not authenticated')
      return
    }

    setIsSaving(true)
    try {
      let profileImageUrl = storeImage
      if (storeImageFile) {
        profileImageUrl = await uploadImage(storeImageFile)
      }

      // Update Store fields (storeName, storeProfileImage)
      const storePayload: Record<string, any> = {
        storeName,
        storeProfileImage: profileImageUrl
      }

      const storeRes = await fetch(`${API_BASE}/api/store/me`, {
        method: 'PUT',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(storePayload)
      })

      if (!storeRes.ok) {
        const err = await storeRes.json().catch(() => ({}))
        throw new Error(err.message || err.msg || 'Failed to update store')
      }

      // For Sellers, also update User profile fields (name, phone, email)
      if (!isStoreManager) {
        const userPayload: Record<string, any> = {
          name: ownerName,
          phoneNumber: phone,
          email,
        }

        const userRes = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}`, {
          method: 'PUT',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(userPayload)
        })

        if (!userRes.ok) {
          const err = await userRes.json().catch(() => ({}))
          throw new Error(err.message || err.msg || 'Failed to update user profile')
        }
      }

      toast.success('Profile updated successfully')
      setStoreImageFile(null)
      setIsEditing(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!userId) {
      toast.error('User not found')
      return
    }
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill all password fields')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    const token = getToken()
    if (!token) {
      toast.error('Not authenticated')
      return
    }
    setIsPasswordSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || 'Failed to change password')
      toast.success('Password updated')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to change password')
    } finally {
      setIsPasswordSaving(false)
    }
  }

  const maskedBusiness = (value: string) => value || '—'

  return (
    <div className="flex">
      <SellerDashboardAside />

      <main className="w-[82.8%] p-6 bg-gray-100">
        <div className='flex items-center justify-between'>
          <h1 className="text-2xl font-bold text-black">Update Profile</h1>

          {!isEditing ? (
            <button
              className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600 disabled:opacity-60"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          ) : (
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600 disabled:opacity-60"
                onClick={() => setShowPopup(true)}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )
          }
        </div >

        <div className="mt-6 overflow-x-auto">
          {isLoading ? (
            <p className="text-gray-600">Loading profile...</p>
          ) : (
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setShowPopup(true) }}>

              {/* Personal Information */}
              <div className="flex bg-white rounded-lg shadow-md overflow-x-auto p-8">
                <div className="flex flex-col items-start w-1/5">
                  <label className="block text-sm font-medium mb-2">Store Logo</label>
                  <div className="relative w-40 h-40 rounded-lg overflow-hidden border-2 border-[#FFA500] group p-2">
                    {storeImage ? (
                      <Image
                        width={1080}
                        height={1080}
                        src={storeImage}
                        alt="Store Logo"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-sm">No image</div>
                    )}
                    <div className="absolute inset-0 bg-[#00000095] opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center space-y-1 transition-all duration-200">
                      <button
                        type="button"
                        className="text-white text-xs font-bold cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Image
                      </button>
                      {storeImage && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreviewImage(storeImage)
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

                <div className='w-4/5'>
                  {/* Store Name (always visible) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 mt-5 gap-6">
                    {[{ key: 'storeName', label: 'Store Name', value: storeName, setter: setStoreName }].map((f) => (
                      <div key={f.key}>
                        <label className="block text-sm font-medium mb-1">{f.label}</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={f.value}
                            onChange={(e) => f.setter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                          />
                        ) : (
                          <div className="bg-gray-100 rounded-lg px-4 py-2 text-black flex justify-between items-center">
                            <span>{f.value || '—'}</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Owner Name (only for Sellers) */}
                    {
                      [{ key: 'ownerName', label: 'Owner Name', value: ownerName, setter: setOwnerName }].map((f) => (
                        <div key={f.key}>
                          <label className="block text-sm font-medium mb-1">{f.label}</label>
                          {isEditing && !isStoreManager ? (
                            <input
                              type="text"
                              value={f.value}
                              onChange={(e) => f.setter(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                            />
                          ) : (
                            <div className="bg-gray-100 rounded-lg px-4 py-2 text-black flex justify-between items-center">
                              <span>{f.value || '—'}</span>
                            </div>
                          )}
                        </div>
                      ))
                    }
                  </div>

                  {/* Phone Number and Email (only for Sellers) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 mt-8 gap-6">
                    {[{ key: 'phone', label: 'Phone Number', value: phone, setter: setPhone }, { key: 'email', label: 'Email Address', value: email, setter: setEmail, type: 'email' }].map((f) => (
                      <div key={f.key}>
                        <label className="block text-sm font-medium mb-1">{f.label}</label>
                        {isEditing && !isStoreManager ? (
                          <input
                            type={f.type || 'text'}
                            value={f.value}
                            onChange={(e) => f.setter(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                          />
                        ) : (
                          <div className="bg-gray-100 rounded-lg px-4 py-2 text-black flex justify-between items-center">
                            <span>{f.value || '—'}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="mt-8 bg-white rounded-lg shadow-md overflow-x-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[{ label: 'Business Name', value: businessName },
                  { label: 'Business Type', value: businessType },
                  { label: 'Business City', value: businessCity },
                  { label: 'Business Address', value: businessAddress },
                  { label: 'License Number', value: licenseNumber },
                  { label: 'Owner CNIC', value: cnic }].map((f) => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium mb-1">{f.label}</label>
                      <div className="bg-gray-100 rounded-lg p-2 text-black">{maskedBusiness(f.value)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Change Password */}
              {!isStoreManager && (
                <div className="mt-8 bg-white rounded-lg shadow-md overflow-x-auto p-8">
                  <label className="block text-sm font-medium mb-2">Change Password</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="password"
                      placeholder="Enter old password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">New Password</label>
                        <input
                          type="password"
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Confirm Password</label>
                        <input
                          type="password"
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handlePasswordChange}
                        disabled={isPasswordSaving}
                        className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600 disabled:opacity-60"
                      >
                        {isPasswordSaving ? 'Updating...' : 'Update Password'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </form>
          )}
        </div>

        {
          showPopup && (
            <div className="fixed inset-0 flex items-center justify-center bg-[#00000090] z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h2 className="text-m mb-6 text-black">Are you sure you want to save the changes?</h2>
                <div className="flex justify-end gap-4">
                  <button
                    className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                    onClick={() => setShowPopup(false)}
                  >
                    No
                  </button>
                  <button
                    className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                    onClick={() => {
                      setShowPopup(false)
                      handleSave()
                    }}
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )
        }

        {
          showVerifyPopup && (
            <div className="fixed inset-0 bg-[#00000095] flex items-center justify-center z-[9999]">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full relative">
                <button
                  onClick={() => setShowVerifyPopup(false)}
                  className="absolute top-5 right-[20px] text-white z-[99999999]"
                  aria-label="Close Preview"
                >
                  <svg width="30" height="30" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
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
          )
        }

      </main >
      {previewImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[1999]"
          onClick={() => setPreviewImage(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-[23px] text-white z-10"
              aria-label="Close Preview"
            >
              <svg width="35" height="35" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#ffffff"></path></svg>
            </button>
            {previewImage && (
              <Image
                width={1080}
                height={1080}
                src={previewImage}
                alt="Store Preview Large"
                className="max-h-[80vh] w-[1080px] h-[1080px] object-contain rounded-lg shadow-lg"
              />
            )}
          </div>
        </div>
      )}

    </div >
  )
}

export default UpdateProfile
