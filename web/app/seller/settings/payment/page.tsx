// ✅ UpdatePayment.tsx - Seller Bank Account Settings Page
'use client'
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { JSX, useEffect, useMemo, useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import SellerDashboardAside from '@/app/components/seller/seller-dasboard-aside'

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_API_URL ?? 'http://localhost:4001').replace(/\/$/, '')

// Bank account interface matching backend structure
interface IBankAccount {
  _id?: string
  bankName: string
  bankCode?: string
  accountNumber: string
  branchCode?: string
  isIban?: boolean
  last4?: string
  isDefault?: boolean
  accountTitle?: string
  [key: string]: any
}

// List of Pakistani banks
const PAKISTAN_BANKS = [
  { name: 'State Bank of Pakistan', code: 'SBP' },
  { name: 'National Bank of Pakistan', code: 'NBP' },
  { name: 'United Bank Limited', code: 'UBL' },
  { name: 'Habib Bank Limited', code: 'HBL' },
  { name: 'Alfalah Bank', code: 'ALFALAH' },
  { name: 'Allied Bank', code: 'ABL' },
  { name: 'Askari Bank', code: 'ASKARI' },
  { name: 'Bank of Punjab', code: 'BOP' },
  { name: 'Bank of Khyber', code: 'BOK' },
  { name: 'Faysal Bank', code: 'FAYSAL' },
  { name: 'First Women Bank', code: 'FWB' },
  { name: 'Meezan Bank', code: 'MEEZAN' },
  { name: 'NCCPL Microfinance Bank', code: 'NCCPL' },
  { name: 'Standard Chartered Bank', code: 'SCBPL' },
  { name: 'JS Bank', code: 'JS' },
  { name: 'Samba Bank', code: 'SAMBA' },
  { name: 'MCB Bank Limited', code: 'MCB' },
  { name: 'Bank Al Habib', code: 'BAHL' },
  { name: 'Sindh Bank', code: 'SB' },
  { name: 'Silk Bank', code: 'SILK' },
]

const UpdatePayment = (): JSX.Element => {
  const { data: session } = useSession()
  const router = useRouter()

  // Check if user is a Store Manager - if so, deny access
  useEffect(() => {
    if (session && (session.user as any)?.role === 'StoreManager') {
      toast.error('Store Managers cannot access payment settings')
      router.push('/seller/dashboard')
    }
  }, [session, router])

  const [accounts, setAccounts] = useState<IBankAccount[]>([])
  const [selectedAccountIndex, setSelectedAccountIndex] = useState<number>(0)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [bankSearchOpen, setBankSearchOpen] = useState(false)
  const [bankSearch, setBankSearch] = useState('')

  const [newBankName, setNewBankName] = useState<string>('')
  const [newBankCode, setNewBankCode] = useState<string>('')
  const [newAccountNumber, setNewAccountNumber] = useState<string>('')
  const [newBranchCode, setNewBranchCode] = useState<string>('')
  const [newAccountTitle, setNewAccountTitle] = useState<string>('')
  const [newIsDefault, setNewIsDefault] = useState(false)
  const [showDeletePopup, setShowDeletePopup] = useState<boolean>(false)
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null)

  const [loadingAdd, setLoadingAdd] = useState<boolean>(false)
  const [loadingDelete, setLoadingDelete] = useState<boolean>(false)

  const token = (session as any)?.backendToken || (session as any)?.accessToken
  const userId = (session as any)?.user?._id ?? (session as any)?.user?.id

  const authHeaders = useMemo<HeadersInit>(() => (token ? { Authorization: `Bearer ${token}` } : new Headers()), [token])

  const filteredBanks = useMemo(() => {
    if (!bankSearch.trim()) return PAKISTAN_BANKS
    return PAKISTAN_BANKS.filter(b => 
      b.name.toLowerCase().includes(bankSearch.toLowerCase()) || 
      b.code.toLowerCase().includes(bankSearch.toLowerCase())
    )
  }, [bankSearch])

  // Fetch seller's bank accounts on mount
  useEffect(() => {
    if (!userId || !token) return

    const fetchAccounts = async () => {
      setLoadingAccounts(true)
      try {
        const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}/bank-accounts`, {
          headers: authHeaders,
        })
        const json: any = await res.json().catch(() => null)
        if (res.ok && Array.isArray(json?.accounts)) {
          setAccounts(json.accounts)
          const idx = json.accounts.findIndex((a: IBankAccount) => !!a.isDefault)
          setSelectedAccountIndex(idx >= 0 ? idx : 0)
        }
      } catch (err) {
        console.error('fetchAccounts error:', err)
        toast.error('Failed to load bank accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }

    fetchAccounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, token])

  async function addAccountToServer(accountPayload: Partial<IBankAccount>): Promise<IBankAccount[] | null> {
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }
    setLoadingAdd(true)
    try {
      const res = await fetch(`${API_BASE}/api/user/${encodeURIComponent(userId)}/bank-accounts`, {
        method: 'POST',
        headers: token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountPayload),
      })
      const json: any = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = json?.msg ?? json?.message ?? `Add account failed (${res.status})`
        toast.error(msg)
        return null
      }
      return Array.isArray(json?.accounts) ? (json.accounts as IBankAccount[]) : null
    } catch (err) {
      console.error('addAccountToServer error:', err)
      toast.error('Failed to add bank account')
      return null
    } finally {
      setLoadingAdd(false)
    }
  }

  async function removeAccountFromServer(accountId: string): Promise<IBankAccount[] | null> {
    if (!userId) {
      toast.error('Not authenticated')
      return null
    }
    setLoadingDelete(true)
    try {
      const res = await fetch(
        `${API_BASE}/api/user/${encodeURIComponent(userId)}/bank-accounts/${encodeURIComponent(accountId)}`,
        {
          method: 'DELETE',
          headers: authHeaders,
        }
      )
      const json: any = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = json?.msg ?? json?.message ?? `Delete account failed (${res.status})`
        toast.error(msg)
        return null
      }
      return Array.isArray(json?.accounts) ? (json.accounts as IBankAccount[]) : null
    } catch (err) {
      console.error('removeAccountFromServer error:', err)
      toast.error('Failed to remove bank account')
      return null
    } finally {
      setLoadingDelete(false)
    }
  }

  const handleAddAccount = async (): Promise<void> => {
    if (!newBankName) {
      toast.error('Select a bank')
      return
    }
    if (!newAccountTitle.trim()) {
      toast.error('Enter account title')
      return
    }
    if (!newAccountNumber.trim()) {
      toast.error('Enter account number or IBAN')
      return
    }

    const trimmedNumber = newAccountNumber.trim().toUpperCase().replace(/\s+/g, '')
    const isPkIban = /^PK\d{2}[A-Z0-9]{20}$/i.test(trimmedNumber)
    const isAccountNumber = /^\d{8,24}$/.test(trimmedNumber)

    if (!isPkIban && !isAccountNumber) {
      toast.error('Enter valid account number (8-24 digits) or IBAN (PK...)')
      return
    }

    if (newBranchCode && !/^[0-9]{4,6}$/.test(newBranchCode)) {
      toast.error('Branch code must be 4-6 digits')
      return
    }

    const payload: Partial<IBankAccount> = {
      bankName: newBankName,
      bankCode: newBankCode,
      accountNumber: trimmedNumber,
      branchCode: newBranchCode || undefined,
      accountTitle: newAccountTitle.trim(),
      isDefault: newIsDefault,
    }

    const prev: IBankAccount[] = [...accounts]
    setAccounts((p: IBankAccount[]) => [...p, payload as IBankAccount])
    const serverAccounts = await addAccountToServer(payload)
    if (serverAccounts && Array.isArray(serverAccounts)) {
      setAccounts(serverAccounts)
      toast.success('Bank account added')
    } else {
      setAccounts(prev)
    }

    // Reset form
    setNewBankName('')
    setNewBankCode('')
    setNewAccountNumber('')
    setNewBranchCode('')
    setNewAccountTitle('')
    setNewIsDefault(false)
    setBankSearch('')
    setBankSearchOpen(false)
  }

  const confirmDeleteAccount = async (): Promise<void> => {
    if (deleteIndex === null) {
      setShowDeletePopup(false)
      return
    }
    const account = accounts[deleteIndex]
    const accountId = String(account._id ?? '')
    if (!accountId) {
      setAccounts((prev: IBankAccount[]) => {
        const upd = [...prev]
        upd.splice(deleteIndex, 1)
        return upd
      })
      setDeleteIndex(null)
      setShowDeletePopup(false)
      return
    }

    const prev: IBankAccount[] = [...accounts]
    setAccounts((p: IBankAccount[]) => {
      const upd = [...p]
      upd.splice(deleteIndex, 1)
      return upd
    })
    const serverAccounts = await removeAccountFromServer(accountId)
    if (serverAccounts && Array.isArray(serverAccounts)) {
      setAccounts(serverAccounts)
      toast.success('Bank account removed')
    } else {
      setAccounts(prev)
    }

    setDeleteIndex(null)
    setShowDeletePopup(false)
  }

  return (
    <div className="flex">
      <SellerDashboardAside />

      <main className="w-[82.8%] p-6 bg-gray-100 flex gap-5">
        <div className="w-[50%]">
          <h1 className="text-2xl font-bold text-black mb-6">Saved Bank Accounts</h1>

          {loadingAccounts ? (
            <p className="text-gray-600 text-center">Loading bank accounts...</p>
          ) : accounts.length === 0 ? (
            <p className="text-gray-600 mb-6 text-center mt-[calc(50vh-100px)] -translate-y-1/2">No Bank Account</p>
          ) : (
            accounts.map((account, index) => {
              const bankName = String(account.bankName ?? '')
              const accountTitle = String(account.accountTitle ?? '')
              const last4 = String(account.last4 ?? account.accountNumber ?? '').slice(-4)
              const key = account._id ?? `account-${index}`

              return (
                <div
                  key={key}
                  className={`bg-white border-2 rounded-lg p-4 mb-4 ${
                    selectedAccountIndex === index ? 'border-[#ffa500] shadow' : 'border-gray-300'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={selectedAccountIndex === index}
                      onChange={() => setSelectedAccountIndex(index)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-black">{accountTitle}</p>
                          <p className="text-sm text-gray-600">{bankName}</p>
                        </div>
                        <span className="text-sm text-gray-700">•••• {last4}</span>
                        <button
                          onClick={() => {
                            setDeleteIndex(index)
                            setShowDeletePopup(true)
                          }}
                          className="text-red-600 text-xs font-bold underline cursor-pointer hover:text-red-800"
                          disabled={loadingDelete}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                      {account.isDefault && (
                        <p className="text-xs text-[#ffa500] font-semibold mt-1">Default Account</p>
                      )}
                    </div>
                  </label>
                </div>
              )
            })
          )}
        </div>

        <div className="w-[50%]">
          <h1 className="text-2xl font-bold text-black mb-6">Add Bank Account</h1>
          <div className="mt-4 space-y-4">
            {/* Bank Selection */}
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name *</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBankSearchOpen(!bankSearchOpen)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500] text-left bg-white"
                >
                  {newBankName || 'Select a bank...'}
                </button>
                {bankSearchOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                    <input
                      type="text"
                      placeholder="Search bank..."
                      value={bankSearch}
                      onChange={(e) => setBankSearch(e.target.value)}
                      className="w-full px-3 py-2 border-b border-gray-300 focus:outline-none sticky top-0 bg-white"
                    />
                    {filteredBanks.map((bank) => (
                      <button
                        key={bank.code}
                        type="button"
                        onClick={() => {
                          setNewBankName(bank.name)
                          setNewBankCode(bank.code)
                          setBankSearchOpen(false)
                          setBankSearch('')
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black"
                      >
                        <p className="font-medium">{bank.name}</p>
                        <p className="text-xs text-gray-600">{bank.code}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Account Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Account Title *</label>
              <input
                type="text"
                value={newAccountTitle}
                onChange={(e) => setNewAccountTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500]"
                placeholder="e.g., My Business Account"
              />
            </div>

            {/* Account Number / IBAN */}
            <div>
              <label className="block text-sm font-medium mb-1">Account Number or IBAN *</label>
              <input
                type="text"
                value={newAccountNumber}
                onChange={(e) => setNewAccountNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500]"
                placeholder="e.g., 12345678 or PK94XXXXXXXXXXXXXXXXXXXX"
              />
              <p className="text-xs text-gray-500 mt-1">Account number: 8-24 digits | IBAN: PK + 24 alphanumeric characters</p>
            </div>

            {/* Branch Code */}
            <div>
              <label className="block text-sm font-medium mb-1">Branch Code (Optional)</label>
              <input
                type="text"
                value={newBranchCode}
                onChange={(e) => setNewBranchCode(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:border-[#FFA500]"
                placeholder="4-6 digits"
              />
            </div>

            {/* Set as Default */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="setDefault"
                checked={newIsDefault}
                onChange={(e) => setNewIsDefault(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              <label htmlFor="setDefault" className="text-sm font-medium cursor-pointer">
                Set as Default Account
              </label>
            </div>

            <button
              className="w-full bg-[#ffa500] text-white px-4 py-2 rounded transition disabled:opacity-50 hover:bg-orange-600 font-semibold"
              onClick={handleAddAccount}
              disabled={loadingAdd}
            >
              {loadingAdd ? 'Adding...' : 'Add Bank Account'}
            </button>
          </div>
        </div>

        {showDeletePopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-[#00000090] z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-m mb-6 text-black">Are you sure you want to remove this bank account?</h2>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowDeletePopup(false)}
                  className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                  disabled={loadingDelete}
                >
                  No
                </button>
                <button
                  onClick={confirmDeleteAccount}
                  className="px-4 py-2 bg-[#FFA500] text-white rounded hover:bg-orange-600"
                  disabled={loadingDelete}
                >
                  {loadingDelete ? 'Removing...' : 'Yes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default UpdatePayment
