"use client"
export default function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div
        className="
          w-8 h-8
          border-4 border-t-transparent
          border-gray-300
          rounded-full
          animate-spin
        "
      />
    </div>
  )
}
