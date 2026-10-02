import { formatReviewDateTime } from "@/lib/utils";
import Avatar from "../global/avatar";
import { Review } from "@/app/home-client";

export default function ReviewItem({ review}: { review: Review }) {

    return (
        <div className="border border-gray-300 p-5 rounded-md bg-gray-50">
            <div className="flex items-center gap-3 mb-2">
                {/* {<img src={review.user.userImage} alt={review.user.name} className="w-10 h-10 rounded-full object-cover" />} */}
                <Avatar firstName={review.userName?.split(" ")[0] || "Auto"} lastName={review.userName?.split(" ")[1]} imageUrl={review?.userImage || ""} />
                <div>
                    <p className="font-semibold text-sm text-gray-800">{review.userName}</p>
                    <div className="text-[#FFA500] text-xs">
                        {'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}
                    </div>
                </div>
            </div>
            <p className="text-sm text-gray-600">{review.comment}</p>
            <p className="text-xs text-gray-400 mt-2">Posted on {formatReviewDateTime(review.createdAt)}</p>
        </div>
    )
}
