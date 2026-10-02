'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useState, useEffect } from 'react'
import Image from '@/app/components/AppImage'
import { Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const RequestAPart = () => {

    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter()
    
    // ✅ States for form fields
    const [companyName, setCompanyName] = useState('')
    const [carName, setCarName] = useState('')
    const [variant, setVariant] = useState('')
    const [partName, setPartName] = useState('')
    const [year, setYear] = useState('')
    const [desc, setDesc] = useState('')
    const [qty, setQty] = useState(1)
    const [images, setImages] = useState<File[]>([])
    
    // ✅ States for dropdowns
    const [makes, setMakes] = useState<string[]>([])
    const [models, setModels] = useState<string[]>([])
    const [loadingMakes, setLoadingMakes] = useState(true)
    const [loadingModels, setLoadingModels] = useState(false)
    
    const { data: session } = useSession();
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";

    // ✅ Fetch makes on component mount
    useEffect(() => {
        const fetchMakes = async () => {
            try {
                setLoadingMakes(true);
                const res = await fetch(`${API_BASE}/api/car-data/makes`);
                const data = await res.json();
                
                if (data.ok) {
                    setMakes(data.makes || []);
                }
            } catch (error) {
                console.error("Error fetching makes:", error);
                toast.error("Failed to load vehicle makes");
            } finally {
                setLoadingMakes(false);
            }
        };
        fetchMakes();
    }, [API_BASE]);

    // ✅ Fetch models when make changes
    useEffect(() => {
        if (!companyName) {
            setModels([]);
            setCarName('');
            return;
        }

        const fetchModels = async () => {
            try {
                setLoadingModels(true);
                const res = await fetch(`${API_BASE}/api/car-data/models?make=${encodeURIComponent(companyName)}`);
                const data = await res.json();
                if (data.ok) {
                    const uniqueModels = Array.from(
                        new Set(data.models?.map((m: any) => m.modelName) || [])
                    ) as string[];
                    setModels(uniqueModels);
                    setCarName('');
                }
            } catch (error) {
                console.error("Error fetching models:", error);
                toast.error("Failed to load models");
            } finally {
                setLoadingModels(false);
            }
        };
        fetchModels();
    }, [companyName, API_BASE]);

    // ✅ Handle image removal
    const handleRemoveImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index))
    }

    // ✅ Handle image upload and display
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setImages([...images, ...Array.from(e.target.files)])
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const formData = new FormData()
            formData.append('companyName', companyName)
            formData.append('carName', carName)
            formData.append('variant', variant)
            formData.append('partName', partName)
            formData.append('year', year)
            formData.append('description', desc)
            formData.append('quantity', String(qty))
            images.forEach((img) => formData.append('images', img, img.name))

            // add token if present
            const token = session?.accessToken || session?.backendToken
            const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? "http://localhost:4001").replace(/\/$/, "")
            
            if (!token || session.user == null) {
                toast.error('You must be logged in to submit a request')
                setIsSubmitting(false)
                router.push('/login')
                return
            }

            const res = await fetch(`${API_BASE}/api/parts-requests`, {
                method: 'POST',
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            })

            if (!res.ok) {
                toast.error('Failed to submit request')
            } else {
                toast.success('Request submitted!')
                // reset form
                setCompanyName('')
                setCarName('')
                setVariant('')
                setPartName('')
                setYear('')
                setDesc('')
                setQty(1)
                setImages([])
            }
        } catch (err) {
            console.error('Submit error', err)
            alert('Submit failed')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <section className="w-full px-[75px] py-12">
            <div className="grid grid-cols-2 items-center bg-white rounded-lg border border-gray-300">
                {/* Left Column: Form */}
                <div className="px-8 py-12 space-y-6">
                    <h2 className="text-2xl font-bold mb-8">REQUEST A PART</h2>

                    <form onSubmit={handleSubmit}>
                        {/* Input Fields Row 1 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Company Name (Make)<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <select
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    disabled={loadingMakes}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px] disabled:opacity-50 cursor-pointer"
                                    required
                                >
                                    <option value="">
                                        {loadingMakes ? "Loading..." : "Select Make"}
                                    </option>
                                    {makes.map((make) => (
                                        <option key={make} value={make}>
                                            {make}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Car Name (Model)<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <select
                                    value={carName}
                                    onChange={(e) => setCarName(e.target.value)}
                                    disabled={!companyName || loadingModels}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px] disabled:opacity-50 cursor-pointer"
                                    required
                                >
                                    <option value="">
                                        {loadingModels ? "Loading..." : "Select Model"}
                                    </option>
                                    {models.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Input Fields Row 2 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Variant<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <input
                                    type="text"
                                    value={variant}
                                    onChange={(e) => setVariant(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Year<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                    required
                                />
                            </div>
                        </div>

                        {/* Part Name and Quantity */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Part Name<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <input
                                    type="text"
                                    value={partName}
                                    onChange={(e) => setPartName(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Quantity<span className="text-[#ffa500] font-sm ml-0.5">*</span></label>
                                <div className="flex items-center justify-between border border-gray-300 rounded px-3 py-1">
                                    <button
                                        onClick={(ev) => { ev.preventDefault(); setQty(qty > 1 ? qty - 1 : 1) }}
                                        className="text-gray-500 hover:text-[#ffa500] text-lg"
                                    >−</button>
                                    <span className="text-sm font-medium">{qty}</span>
                                    <button
                                        onClick={(ev) => { ev.preventDefault(); setQty(qty + 1) }}
                                        className="text-gray-500 hover:text-[#ffa500] text-lg"
                                    >+</button>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div className="grid grid-cols-1">
                            <label className="block text-sm font-medium mb-1">Description<span className="text-[#ffa500] font-sm ml-0.5">(Optional)</span></label>
                            <input
                                type="text"
                                value={desc}
                                onChange={(e) => setDesc(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]"
                            />
                        </div>

                        {/* Image Upload Section */}
                        <div>
                            <p className="block text-sm font-medium mb-2">Upload Images (upto 8)<span className="text-[#ffa500] font-sm ml-0.5">(Optional)</span></p>
                            <div className="grid grid-cols-4 gap-4">
                                {/* Show uploaded images */}
                                {images.map((img, i) => (
                                    <div key={i} className="relative flex justify-center border border-[#ffa500] rounded-md overflow-hidden">
                                        <Image
                                            src={URL.createObjectURL(img)}
                                            alt={`uploaded-${i}`}
                                            width={100}
                                            height={100}
                                            className="object-contain"
                                        />
                                        {/* Delete button overlay */}
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                handleRemoveImage(i)
                                            }}
                                            className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition"
                                            title="Remove image"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                                {/* Upload Input */}
                                {images.length < 8 && (
                                    <label className="flex items-center justify-center w-full h-[100px] border-2 border-dashed border-[#ffa500] rounded-md cursor-pointer">
                                        <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                                        <Plus className="text-[#ffa500]" />
                                    </label>
                                )}
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="mt-4 bg-[#ffa500] text-white text-m px-15 py-2.5 rounded shadow"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Submitting..." : "Submit Request"}
                        </button>
                    </form>
                </div>

                {/* Right Column: Image Banner */}
                <div className="bg-[#ffa500] h-full flex justify-center items-center rounded-tr-lg rounded-br-lg">
                    <Image
                        src="/images/requestapart.png"
                        alt="Car banner"
                        width={500}
                        height={300}
                        className="object-contain"
                    />
                </div>
            </div>
        </section>
    )
}

export default RequestAPart
