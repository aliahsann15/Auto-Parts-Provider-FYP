import React, { FC, useState } from 'react'
import Image from '@/app/components/AppImage'

interface AvatarProps {
  firstName?: string
  lastName?: string
  size?: number
  imageUrl?: string
}

const Avatar: FC<AvatarProps> = ({ firstName, lastName, size = 40, imageUrl }) => {
  // State to track if loading the image failed
  const [imgError, setImgError] = useState(false)

  // Generate initials from first and last name
  let initials = "A B";
  if(firstName && lastName) {
  initials = (
    firstName.charAt(0) +
    lastName.charAt(0)
  ).toUpperCase()
}

  // A simple color palette (Tailwind classes)
  const bgClasses = [
    'bg-red-500',
    'bg-green-500',
    'bg-blue-500',
    'bg-yellow-500',
    'bg-indigo-500',
    'bg-pink-500',
  ]

  // Deterministically pick a background color based on initials
  const charSum = initials.charCodeAt(0) + initials.charCodeAt(1)
  const colorClass = bgClasses[charSum % bgClasses.length]

  // If an image URL is provided and hasn't errored, show the image
  if(imageUrl && imageUrl.length < 1) setImgError(true);
  if (imageUrl && !imgError) {
    return (
      <Image
        src={imageUrl}
        alt={`${firstName} ${lastName}`}
        width={size}
        height={size}
        className="rounded-full object-cover"
        // If the image fails to load, fall back to initials
        onError={() => setImgError(true)}
      />
    )
  }

  // Otherwise, render the initials avatar as fallback
  return (
    <div
      className={
        `flex items-center justify-center rounded-full text-white ${colorClass}`
      }
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
      }}
    >
      {initials}
    </div>
  )
}

export default Avatar
