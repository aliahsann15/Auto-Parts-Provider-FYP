'use client'

import React from 'react'
import Image from '@/app/components/AppImage'
import type { ChatItem } from '@/types'
// import { useSession } from 'next-auth/react'
import Avatar from '../global/avatar'

// -------------------
// Chat Section Component (data via props)
// -------------------

// Extended ChatItem for seller with request details
export interface SellerChatItem extends ChatItem {
  buyerName?: string
  requestName?: string
  requestNumber?: string
  carName?: string
  companyName?: string
  quantity?: number
  lastMessage?: string
  lastImageUrl?: string
}

// Props for ChatSection
interface ChatSectionProps {
  items: ChatItem[] | SellerChatItem[]
  onSelect: (item: ChatItem | SellerChatItem) => void
  activeChatId: number | null | string
  maxHeight?: string
  showRequestDetails?: boolean
}

const ChatList: React.FC<ChatSectionProps> = ({ 
  items, 
  onSelect, 
  activeChatId,
  maxHeight = 'max-h-[300px]',
  showRequestDetails = false
}) => {
  // const { data: session, status } = useSession()

  const renderChatContent = (item: ChatItem | SellerChatItem) => {
    if (showRequestDetails && 'requestName' in item) {
      // Seller view: show request details
      console.log("Rendering seller chat item:", item);
      return (
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[14px] truncate">{item.requestName? item.requestName + " - " + item.companyName + " " + item.carName : item.name + " - " + item.companyName + " " + item.carName}</p>
          <p className="text-[12px] text-gray-600 truncate max-w-xs">
            {item.buyerName && `Buyer: ${item.buyerName} | `}
            {item.lastMessage || (item.lastImageUrl ? 'Sent an image' : item.message)}
          </p>
        </div>
      )
    }

    // Buyer view: show seller/user info
    return (
      <div className="flex-1 min-w-0">
        <p className="font-medium text-[14px] truncate">{item.name}</p>
        <p className="text-[12px] truncate max-w-xs">{item.message}</p>
      </div>
    )
  }

  return (
    <div className={`overflow-y-auto ${maxHeight}`}>
      <ul className="">
        {items.map((item) => (
          <li
            key={item.id}
            onClick={() => onSelect(item)}
            className={`flex items-center justify-between px-2 py-4 rounded-lg cursor-pointer transition-all ${
              activeChatId === item.id ? 'bg-[#ffa500] text-white' : 'hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center flex-1 min-w-0">
              <div className="relative mr-3 flex-shrink-0">
                {item.avatar ? (
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <Avatar 
                    firstName={item.name?.split(" ")[0] || "Auto"} 
                    lastName={item.name?.split(" ")[1] || "Parts"} 
                    imageUrl={item.avatar || ""} 
                  />
                )}
                <span
                  className={`absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-white ${
                    item.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
              {renderChatContent(item)}
            </div>
            <div className="flex flex-col items-end flex-shrink-0 ml-2">
              <span className="text-sm whitespace-nowrap">{item.time}</span>
              {typeof item.unreadCount === 'number' && item.unreadCount > 0 && (
                <span className="mt-2 inline-flex items-center justify-center bg-[#ffa500] text-white text-xs font-semibold rounded-full w-5 h-5">
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}


export default ChatList
