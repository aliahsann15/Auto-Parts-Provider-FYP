'use client'

import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import Image from '@/app/components/AppImage'
import { FiCamera, FiEye, FiMessageCircle, FiUserPlus, FiArrowUp, FiArrowDown, FiEyeOff } from 'react-icons/fi'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'
import SellerFeatureProductSelector from '@/app/components/seller/seller-store-featured-product'
import SellerSalesProductSelector from '@/app/components/seller/seller-store-sales-product'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

type ProductOption = {
  id: string
  name: string
  image?: string
  price?: string | number
}

const mockData = {
  storeName: 'Ahmed Auto Parts',
  followers: '1.8K followers',
  itemsSold: 500,
  reviews: 100,
  rating: 5,
  description: 'We sell auto parts and accessories at the best prices.',
  coverImage: '/images/tool1.png',
  logoImage: '/images/logo-white.png',
  storeImage: '/images/salesbanner.jpeg',
  salesImage: '/images/salesbanner.jpeg'
}

const tabs = ['Store', 'Products', 'Sale']

const normalizeSectionKey = (key: string) => (key === 'salesbanner' ? 'salesBanner' : key)

const StoreProfileHeader = () => {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const { data: session } = useSession()
  const API_BASE = process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001'
  
  const [editingField, setEditingField] = useState<string | null>(null)
  const [storeDescription, setStoreDescription] = useState(mockData.description)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isCoverHovered, setIsCoverHovered] = useState(false)
  const [isBannerHovered, setIsBannerHovered] = useState(false)
  const [isLogoHovered, setIsLogoHovered] = useState(false)
  const [isSalesBannerHovered, setIsSalesBannerHovered] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const salesBannerInputRef = useRef<HTMLInputElement>(null)
  const [selectedTab, setSelectedTab] = useState<string>('Store')
  const [Cover, setCover] = useState<string>(mockData.coverImage)
  const [logo, setlogo] = useState<string>(mockData.logoImage)
  const [Banner, setBanner] = useState<string>(mockData.storeImage)
  const [SalesBanner, setSalesBanner] = useState<string>(mockData.salesImage)
  const [storeName, setStoreName] = useState(mockData.storeName)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [featuredIds, setFeaturedIds] = useState<string[]>([])
  const [saleIds, setSaleIds] = useState<string[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productPickerType, setProductPickerType] = useState<'featured' | 'sale' | null>(null)

  const onFeaturedChange = (ids: string[]) => {
    setFeaturedIds(ids)
    setHasUnsavedChanges(true)
  }

  const onSaleChange = (ids: string[]) => {
    setSaleIds(ids)
    setHasUnsavedChanges(true)
  }

  const toggleProductPick = (id: string, type: 'featured' | 'sale') => {
    if (type === 'featured') {
      if (featuredIds.includes(id)) {
        onFeaturedChange(featuredIds.filter(p => p !== id))
      } else {
        onFeaturedChange([...featuredIds, id])
      }
    } else {
      if (saleIds.includes(id)) {
        onSaleChange(saleIds.filter(p => p !== id))
      } else {
        onSaleChange([...saleIds, id])
      }
    }
  }
  
  // Track uploaded files for FormData
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [salesBannerFile, setSalesBannerFile] = useState<File | null>(null)

  const [storeSections, setStoreSections] = useState([
    { key: 'banner', component: 'Banner Section', visible: true },
    { key: 'featured', component: 'Featured Products Section', visible: true },
    { key: 'salesBanner', component: 'Sales Banner Section', visible: true },
    { key: 'sale', component: 'Sale Products Section', visible: true },
    { key: 'best', component: 'Best Selling Products Section', visible: true },
    { key: 'reviews', component: 'Store Reviews Section', visible: true }

  ])

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...storeSections]
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === newSections.length - 1)) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newSections[swapIndex]
    newSections[swapIndex] = newSections[index]
    newSections[index] = temp
    setStoreSections(newSections)
  }

  const toggleVisibility = (index: number) => {
    const newSections = [...storeSections]
    newSections[index].visible = !newSections[index].visible
    setStoreSections(newSections)
  }
  
  const uploadImage = async (file: File, folderName: string, token: string): Promise<string> => {
    const formData = new FormData()
    formData.append('image', file)
    formData.append('folderName', folderName)
    
    const response = await fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Failed to upload image')
    }
    
    const data = await response.json()
    return data.url // Returns /images/folderName/filename.jpg
  }
  
  const handleSave = async () => {
    if (!session) {
      toast.error('Not authenticated')
      return
    }
    
    setIsSaving(true)
    try {
      const token = (session as any)?.backendToken || (session as any)?.accessToken
      if (!token) {
        toast.error('Authentication required')
        return
      }
      
      // Upload images first and get URLs
      let coverUrl = Cover
      let logoUrl = logo
      let bannerUrl = Banner
      let salesBannerUrl = SalesBanner
      
      if (coverFile) {
        coverUrl = await uploadImage(coverFile, 'store-covers', token)
      }
      if (logoFile) {
        logoUrl = await uploadImage(logoFile, 'store-logos', token)
      }
      if (bannerFile) {
        bannerUrl = await uploadImage(bannerFile, 'store-banners', token)
      }
      if (salesBannerFile) {
        salesBannerUrl = await uploadImage(salesBannerFile, 'store-sales-banners', token)
      }
      
      // Prepare store data
      const sectionsOrder = storeSections.map(s => s.key)
      const sectionsVisibility: Record<string, boolean> = {}
      storeSections.forEach(s => {
        sectionsVisibility[s.key] = s.visible
      })
      
      const storeData = {
        storeName,
        storeBio: storeDescription,
        storeCoverImage: coverUrl,
        storeProfileImage: logoUrl,
        storeBanners: [bannerUrl],
        storeSalesBanners: [salesBannerUrl],
        featuredProductIds: featuredIds,
        saleProductIds: saleIds,
        sectionsOrder,
        sectionsVisibility
      }
      
      // Save store data
      const response = await fetch(`${API_BASE}/api/store/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(storeData)
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.msg || 'Failed to save store')
      }
      
      toast.success('Store saved successfully')
      
      // Update state with new URLs
      setCover(coverUrl)
      setlogo(logoUrl)
      setBanner(bannerUrl)
      setSalesBanner(salesBannerUrl)
      setHasUnsavedChanges(false)
      
      // Clear file references after successful save
      setCoverFile(null)
      setLogoFile(null)
      setBannerFile(null)
      setSalesBannerFile(null)
    } catch (error) {
      console.error('Error saving store:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save store')
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpload = (e: ChangeEvent<HTMLInputElement>, type: 'cover' | 'logo' | 'banner' | 'salesBanner') => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      if (type === 'cover') {
        setCover(url)
        setCoverFile(file)
      }
      if (type === 'logo') {
        setlogo(url)
        setLogoFile(file)
      }
      if (type === 'banner') {
        setBanner(url)
        setBannerFile(file)
      }
      if (type === 'salesBanner') {
        setSalesBanner(url)
        setSalesBannerFile(file)
      }
      setHasUnsavedChanges(true)
    }
  }

  useEffect(() => {
    const fetchStore = async () => {
      if (!session) return
      try {
        const token = (session as any)?.backendToken || (session as any)?.accessToken
        if (!token) {
          toast.error('Authentication required')
          return
        }
        
        const response = await fetch(`${API_BASE}/api/store/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) throw new Error('Failed to fetch store')
        
        const data = await response.json()
        const store = data.store
        
        if (store) {
          setStoreName(store.storeName || mockData.storeName)
          setStoreDescription(store.storeBio || mockData.description)
          setCover(store.storeCoverImage || mockData.coverImage)
          setlogo(store.storeProfileImage || mockData.logoImage)
          setFeaturedIds((store.featuredProductIds || []).map((id: any) => String(id)))
          setSaleIds((store.saleProductIds || []).map((id: any) => String(id)))
          
          if (store.storeBanners?.[0]) setBanner(store.storeBanners[0])
          if (store.storeSalesBanners?.[0]) setSalesBanner(store.storeSalesBanners[0])
          
          if (store.sectionsOrder) {
            const mapped = store.sectionsOrder.map((rawKey: string) => {
              const key = normalizeSectionKey(rawKey)
              const labels: Record<string, string> = {
                banner: 'Banner Section',
                featured: 'Featured Products Section',
                salesBanner: 'Sales Banner Section',
                sale: 'Sale Products Section',
                best: 'Best Selling Products Section',
                reviews: 'Store Reviews Section'
              }
              return {
                key,
                component: labels[key] || key,
                visible: store.sectionsVisibility?.[rawKey] ?? store.sectionsVisibility?.[key] ?? true
              }
            })
            setStoreSections(mapped)
          }
          setHasUnsavedChanges(false)
        }
      } catch (error) {
        console.error('Error fetching store:', error)
        toast.error('Failed to load store data')
      }
    }
    
    fetchStore()
  }, [session, API_BASE])

  useEffect(() => {
    const fetchProducts = async () => {
      if (!session) return
      setProductsLoading(true)
      try {
        const token = (session as any)?.backendToken || (session as any)?.accessToken
        if (!token) {
          toast.error('Authentication required')
          return
        }

        const response = await fetch(`${API_BASE}/api/products?limit=100`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) throw new Error('Failed to fetch products')

        const data = await response.json()
        const mapped: ProductOption[] = (data.products || []).map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          image: p.images?.[0],
          price: p.salePrice ?? p.price
        }))
        setProducts(mapped)
      } catch (error) {
        console.error('Error fetching products:', error)
        toast.error('Failed to load products')
      } finally {
        setProductsLoading(false)
      }
    }

    fetchProducts()
  }, [session, API_BASE])
  
  useEffect(() => {
    window.addEventListener("scroll", () => {
      const header = document.querySelector("#header-manage")
      if (header) {
        const scrollTop = window.scrollY
        if (scrollTop > 40) {
          header.classList.add("top-0", "shadow-md")
        } else {
          header.classList.remove("top-0", "shadow-md")
        }
      }
    })
  }, [])

  return (
    <div className="flex bg-gray-50 relative">
        <SellerDashboardAside />


      <div id='header-manage' className="transition-all duration-300 p-6 w-[80.3%] right-0 z-[10000000] bg-gray-50 fixed flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="w-full text-2xl font-bold text-black">
          Edit Store
        </h1>

        <div className="flex gap-4 items-center">
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-[#FFA500] text-white px-6 py-2 rounded hover:bg-orange-600 transition disabled:opacity-50">
            {isSaving ? 'Saving...' : 'Save'}
          </button>


          {/* Preview Button */}
          <button
            className="bg-[#FFA500] text-white px-6 py-2 rounded  hover:bg-orange-600 transition"
            onClick={async () => {
              if (hasUnsavedChanges) {
                const proceed = window.confirm('You have unsaved changes. Save before preview?')
                if (proceed) {
                  await handleSave()
                } else {
                  // undo: refetch server state
                  const token = (session as any)?.backendToken || (session as any)?.accessToken
                  const res = await fetch(`${API_BASE}/api/store/me`, { headers: { Authorization: `Bearer ${token}` } })
                  const data = await res.json()
                  const s = data.store
                  setStoreDescription(s.storeBio || '')
                  setCover(s.storeCoverImage || '')
                  setlogo(s.storeProfileImage || '')
                  setHasUnsavedChanges(false)
                }
              }
              window.location.href = '/seller/store/preview'
            }}
          >
            Preview
          </button>
        </div>
      </div>
      <main className="w-[82.2%] p-6 pt-[100px]">
        <div className="rounded-xl bg-white shadow">
          {/* Cover Section */}
          <div
            className="rounded-tr-xl rounded-tl-xl relative w-full h-[300px] bg-gray-100 group overflow-hidden"
            onMouseEnter={() => setIsCoverHovered(true)}
            onMouseLeave={() => setIsCoverHovered(false)}
          >
            {Cover ? (
              <Image src={Cover} alt="Store Cover" fill className="object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200" />
            )}
            {isCoverHovered && (
              <div className="absolute inset-0 bg-[#00000090] flex items-center justify-center gap-4 transition">
                <button onClick={(e) => { e.stopPropagation(); setPreviewImage(Cover) }} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                  <FiEye /> View
                </button>
                <button onClick={() => coverInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                  <FiCamera /> Change Cover
                </button>
              </div>
            )}
            <input type="file" accept="images/*" onChange={(e) => handleUpload(e, 'cover')} ref={coverInputRef} className="hidden" />
          </div>

          {/* Store Info Section */}
          <div className="px-6 pb-8 bg-white rounded-br-xl rounded-bl-xl">
            <div className="flex flex-row gap-4 -mt-20">
              <div className="relative w-36 h-36 border-4 border-[#ffa500] rounded-full overflow-hidden bg-black group" onMouseEnter={() => setIsLogoHovered(true)} onMouseLeave={() => setIsLogoHovered(false)}>
                {logo ? (
                  <Image src={logo} alt="Store Logo" fill className="object-contain" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black">
                    <span className="text-white text-3xl font-bold">{storeName?.charAt(0) ?? 'S'}</span>
                  </div>
                )}
                {isLogoHovered && (
                  <div className="absolute inset-0 bg-[#00000090] flex flex-col items-center justify-center text-white gap-2">
                    {logo && (
                      <button onClick={(e) => { e.stopPropagation(); setPreviewImage(logo) }} className="flex items-center gap-1 text-sm hover:underline">
                        <FiEye /> View
                      </button>
                    )}
                    <button onClick={() => logoInputRef.current?.click()} className="flex items-center gap-1 text-sm hover:underline">
                      <FiCamera /> Change
                    </button>
                  </div>
                )}
                <input type="file" accept="images/*" onChange={(e) => handleUpload(e, 'logo')} ref={logoInputRef} className="hidden" />
              </div>

              <div className='w-[85%] flex flex-row justify-between mt-24'>
                <div className='flex flex-col gap-1'>
                  <h2 className="text-2xl font-bold text-gray-800">{storeName}</h2>
                  <div className='flex gap-3 text-gray-500'>
                    <p>{mockData.itemsSold} Items sold</p>
                    <p>{mockData.followers}</p>
                  </div>
                  <span className="text-[#FFA500]">
                    {'★'.repeat(mockData.rating) + '☆'.repeat(5 - mockData.rating)} (Out of {mockData.reviews} Reviews)
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-white bg-[#ffa500] rounded">
                    <FiUserPlus size={16} /> Follow
                  </button>
                  <button className="flex items-center justify-center gap-2 px-4 py-2 text-sm text-[#ffa500] border border-[#ffa500] rounded hover:bg-orange-50">
                    <FiMessageCircle size={16} /> Chat Now
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium mb-1">Bio</label>
              {editingField === 'description' ? (
                <textarea rows={4} value={storeDescription} onChange={(e) => { setStoreDescription(e.target.value); setHasUnsavedChanges(true) }} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] focus:border-[2px]" />
              ) : (
                <div className="bg-gray-100 rounded-lg p-2 text-black flex justify-between items-center">
                  <span>{storeDescription || 'Click to add your store bio'}</span>
                  <button onClick={() => setEditingField('description')} className="text-[#FFA500] text-sm hover:underline">Change</button>
                </div>
              )}
            </div>

            <div className="mt-10 text-[14px] flex items-center">
              <div className="w-fit rounded-lg shadow flex gap-4 p-[10px] bg-gray-100">
                {tabs.map((tab) => (
                  <button key={tab} onClick={() => setSelectedTab(tab)} className={`p-1 ${selectedTab === tab ? 'bg-[#FFA500] text-white rounded-[10px] p-[10px]' : ''}`}>
                    {tab.replace('&', 'and')}
                  </button>
                ))}
              </div>
            </div>

            {selectedTab === 'Store' && (
              <div className="mt-10 space-y-8">
                {storeSections.map((section, idx) => (
                  <div key={section.key} className="w-full relative group border border-gray-300 rounded-xl ">
                    <div className='bg-[#FFA500] text-white py-4 px-4 rounded-tl-xl rounded-tr-xl'>
                      <span className="font-medium text-md mr-2 capitalize">{section.component}</span>
                      <div className="absolute top-5   right-4 flex items-center gap-2">

                        <button disabled={idx === 0} onClick={() => moveSection(idx, 'up')} className="text-white disabled:opacity-30"><FiArrowUp /></button>
                        <button disabled={idx === storeSections.length - 1} onClick={() => moveSection(idx, 'down')} className="text-white disabled:opacity-30"><FiArrowDown /></button>
                        <button onClick={() => toggleVisibility(idx)} className="text-white">
                          {section.visible ? <FiEye /> : <FiEyeOff />}
                        </button>
                      </div></div>
                    <div className='p-4'>
                      {section.visible && section.key === 'banner' && (
                        <div className="h-[400px] bg-gray-100 overflow-hidden rounded-lg relative group mt-6"
                          onMouseEnter={() => setIsBannerHovered(true)}
                          onMouseLeave={() => setIsBannerHovered(false)}>
                          <Image src={Banner} alt="Store Banner" fill className="object-cover" />
                          {isBannerHovered && (
                            <div className="absolute inset-0 bg-[#00000090] flex items-center justify-center gap-4 transition">
                              <button onClick={(e) => { e.stopPropagation(); setPreviewImage(Banner) }} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                                <FiEye /> View
                              </button>
                              <button onClick={() => bannerInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                                <FiCamera /> Change Banner
                              </button>
                            </div>
                          )}
                          <input type="file" accept="images/*" onChange={(e) => handleUpload(e, 'banner')} ref={bannerInputRef} className="hidden" />
                        </div>
                      )}

                      {section.visible && section.key === 'featured' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800">Featured products</h4>
                            {!productsLoading && products.length > 0 && (
                              <button
                                className="px-3 py-1 text-sm border border-[#FFA500] text-[#FFA500] rounded hover:bg-orange-50"
                                onClick={() => setProductPickerType('featured')}
                              >
                                Add existing products
                              </button>
                            )}
                          </div>
                          {productsLoading ? (
                            <p className="text-gray-500">Loading products...</p>
                          ) : products.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
                              <p className="text-gray-600 mb-2">No products yet</p>
                              <button
                                className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600"
                                onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                              >
                                Add New Product
                              </button>
                            </div>
                          ) : (
                            <SellerFeatureProductSelector
                              products={products}
                              selectedIds={featuredIds}
                              onChange={onFeaturedChange}
                            />
                          )}
                        </>
                      )}


                      {section.visible && section.key === 'salesBanner' && (
                        <div className="h-[400px] bg-gray-100 overflow-hidden rounded-lg relative group mt-6"
                          onMouseEnter={() => setIsSalesBannerHovered(true)}
                          onMouseLeave={() => setIsSalesBannerHovered(false)}>
                          <Image src={SalesBanner} alt="Store Sales Banner" fill className="object-cover" />
                          {isSalesBannerHovered && (
                            <div className="absolute inset-0 bg-[#00000090] flex items-center justify-center gap-4 transition">
                              <button onClick={(e) => { e.stopPropagation(); setPreviewImage(SalesBanner) }} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                                <FiEye /> View
                              </button>
                              <button onClick={() => salesBannerInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-[#ffa500] bg-opacity-20 rounded hover:bg-opacity-40 text-white text-sm">
                                <FiCamera /> Change Banner
                              </button>
                            </div>
                          )}
                          <input type="file" accept="images/*" onChange={(e) => handleUpload(e, 'salesBanner')} ref={salesBannerInputRef} className="hidden" />
                        </div>
                      )}





                      {section.visible && section.key === 'sale' && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-800">Sale products</h4>
                            {!productsLoading && products.length > 0 && (
                              <button
                                className="px-3 py-1 text-sm border border-[#FFA500] text-[#FFA500] rounded hover:bg-orange-50"
                                onClick={() => setProductPickerType('sale')}
                              >
                                Add existing products
                              </button>
                            )}
                          </div>
                          {productsLoading ? (
                            <p className="text-gray-500">Loading products...</p>
                          ) : products.length === 0 ? (
                            <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
                              <p className="text-gray-600 mb-2">No products yet</p>
                              <button
                                className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600"
                                onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                              >
                                Add New Product
                              </button>
                            </div>
                          ) : (
                            <SellerSalesProductSelector
                              products={products}
                              selectedIds={saleIds}
                              onChange={onSaleChange}
                            />
                          )}
                        </>
                      )}
                      {section.visible && section.component === 'Best Selling Products Section' && (
                        <div className="">
                          <h3 className="text-lg font-semibold">Generated Automatically</h3>
                          <p className="text-gray-500">No need to add manually will generated automatically by the system..</p>
                        </div>
                      )}
                      {section.visible && section.component === 'Store Reviews Section' && (
                        <div className="">
                          <h3 className="text-lg font-semibold">Generated Automatically</h3>
                          <p className="text-gray-500">No need to add manually will generated automatically by the system..</p>
                        </div>
                      )}
                    </div></div>
                ))}
              </div>
            )}

            {selectedTab === 'Products' && (
              <div className="mt-10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Featured products</h3>
                  {!productsLoading && products.length > 0 && (
                    <div className="flex gap-3">
                      <button
                        className="px-4 py-2 text-sm border border-[#FFA500] text-[#FFA500] rounded hover:bg-orange-50"
                        onClick={() => setProductPickerType('featured')}
                      >
                        Add existing products
                      </button>
                      <button
                        className="px-4 py-2 text-sm bg-[#FFA500] text-white rounded hover:bg-orange-600"
                        onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                      >
                        Add new product
                      </button>
                    </div>
                  )}
                </div>
                {productsLoading ? (
                  <p className="text-gray-500">Loading products...</p>
                ) : products.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
                    <p className="text-gray-600 mb-2">No products yet</p>
                    <button
                      className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600"
                      onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                    >
                      Add New Product
                    </button>
                  </div>
                ) : (
                  <SellerFeatureProductSelector
                    products={products}
                    selectedIds={featuredIds}
                    onChange={onFeaturedChange}
                    title="Manage Featured Products (Max 12)"
                  />
                )}
              </div>
            )}

            {selectedTab === 'Sale' && (
              <div className="mt-10 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Sale products</h3>
                  {!productsLoading && products.length > 0 && (
                    <div className="flex gap-3">
                      <button
                        className="px-4 py-2 text-sm border border-[#FFA500] text-[#FFA500] rounded hover:bg-orange-50"
                        onClick={() => setProductPickerType('sale')}
                      >
                        Add existing products
                      </button>
                      <button
                        className="px-4 py-2 text-sm bg-[#FFA500] text-white rounded hover:bg-orange-600"
                        onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                      >
                        Add new product
                      </button>
                    </div>
                  )}
                </div>
                {productsLoading ? (
                  <p className="text-gray-500">Loading products...</p>
                ) : products.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-lg border border-dashed">
                    <p className="text-gray-600 mb-2">No products yet</p>
                    <button
                      className="bg-[#FFA500] text-white px-4 py-2 rounded hover:bg-orange-600"
                      onClick={async () => { await handleSave(); window.location.href = '/seller/products/add?from=edit-store' }}
                    >
                      Add New Product
                    </button>
                  </div>
                ) : (
                  <SellerSalesProductSelector
                    products={products}
                    selectedIds={saleIds}
                    onChange={onSaleChange}
                    title="Manage Sale Products (Max 12)"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      {productPickerType && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[2000] flex items-center justify-center px-4" onClick={() => setProductPickerType(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-lg font-semibold">Add existing products</h3>
              <button className="text-gray-500 hover:text-gray-800" onClick={() => setProductPickerType(null)}>✕</button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[70vh] space-y-3">
              {productsLoading ? (
                <p className="text-gray-500">Loading products...</p>
              ) : products.length === 0 ? (
                <p className="text-gray-600">No products available. Create one first.</p>
              ) : (
                products.map((p) => {
                  const selected = productPickerType === 'featured' ? featuredIds.includes(p.id) : saleIds.includes(p.id)
                  return (
                    <div key={p.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-orange-50">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative">
                          {p.image ? (
                            <Image src={p.image} alt={p.name} fill className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800">{p.name}</span>
                          {p.price !== undefined && <span className="text-sm text-gray-500">{p.price}</span>}
                        </div>
                      </div>
                      <button
                        className={`px-4 py-2 text-sm rounded ${selected ? 'bg-gray-200 text-gray-800' : 'bg-[#FFA500] text-white hover:bg-orange-600'}`}
                        onClick={() => toggleProductPick(p.id, productPickerType)}
                      >
                        {selected ? 'Remove' : 'Add'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex justify-end border-t px-4 py-3">
              <button
                className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                onClick={() => setProductPickerType(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
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
              <svg width="35" height="35" viewBox="0 -0.5 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.96967 16.4697C6.67678 16.7626 6.67678 17.2374 6.96967 17.5303C7.26256 17.8232 7.73744 17.8232 8.03033 17.5303L6.96967 16.4697ZM13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697L13.0303 12.5303ZM11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303L11.9697 11.4697ZM18.0303 7.53033C18.3232 7.23744 18.3232 6.76256 18.0303 6.46967C17.7374 6.17678 17.2626 6.17678 16.9697 6.46967L18.0303 7.53033ZM13.0303 11.4697C12.7374 11.1768 12.2626 11.1768 11.9697 11.4697C11.6768 11.7626 11.6768 12.2374 11.9697 12.5303L13.0303 11.4697ZM16.9697 17.5303C17.2626 17.8232 17.7374 17.8232 18.0303 17.5303C18.3232 17.2374 18.3232 16.7626 18.0303 16.4697L16.9697 17.5303ZM11.9697 12.5303C12.2626 12.8232 12.7374 12.8232 13.0303 12.5303C13.3232 12.2374 13.3232 11.7626 13.0303 11.4697L11.9697 12.5303ZM8.03033 6.46967C7.73744 6.17678 7.26256 6.17678 6.96967 6.46967C6.67678 6.76256 6.67678 7.23744 6.96967 7.53033L8.03033 6.46967ZM8.03033 17.5303L13.0303 12.5303L11.9697 11.4697L6.96967 16.4697L8.03033 17.5303ZM13.0303 12.5303L18.0303 7.53033L16.9697 6.46967L11.9697 11.4697L13.0303 12.5303ZM11.9697 12.5303L16.9697 17.5303L18.0303 16.4697L13.0303 11.4697L11.9697 12.5303ZM13.0303 11.4697L8.03033 6.46967L6.96967 7.53033L11.9697 12.5303L13.0303 11.4697Z" fill="#ffffff"></path></svg>
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
    </div>
  )
}

export default StoreProfileHeader
