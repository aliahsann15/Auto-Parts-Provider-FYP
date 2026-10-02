"use client"
import { Session } from "next-auth";
import { useState } from "react"

export default async function ReviewForm({session}: {session: Session}) {
    const [rating, setRating] = useState<number>(0)
    const [hoverRating, setHoverRating] = useState<number>(0);

    return (
        <form className="space-y-4">
            {/* name & email could come from session too */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Your Name"
                    defaultValue={session?.user.name || ""}
                    readOnly
                    className="w-full border rounded px-4 py-2 bg-gray-100 text-sm"
                />
                <input
                    type="email"
                    placeholder="Your Email"
                    defaultValue={session?.user.email || ""}
                    readOnly
                    className="w-full border rounded px-4 py-2 bg-gray-100 text-sm"
                />
            </div>

            <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                    Your Rating
                </label>
                <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => {
                        const fill = hoverRating >= star || (!hoverRating && rating >= star)
                        return (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                                className="text-2xl transition-transform"
                            >
                                <span className={fill ? 'text-[#FFA500]' : 'text-gray-300'}>
                                    {fill ? '★' : '☆'}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>

            <textarea
                placeholder="Write your review..."
                rows={4}
                className="w-full border rounded px-4 py-2 text-sm focus:ring-2 focus:ring-[#FFA500]"
            />

            <button
                type="submit"
                className="bg-[#FFA500] hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold shadow"
            >
                Submit Review
            </button>
        </form>
    )
}