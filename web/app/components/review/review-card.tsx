// Review Card 

import React from "react";
import Image from "@/app/components/AppImage";

interface Review {
    name: string;
    title: string;
    img: string;
    text: string;
}

// Props for the component
interface Props {
    t: Review;
}
const ReviewCard: React.FC<Props> = ({
    t,
}) => {

    return (

        <div
            className="p-8 rounded-[32px] h-full text-black bg-[#D9D9D9]"

        >
            <div className="flex items-center gap-4 mb-4">
                <Image
                    src={t.img}
                    alt={t.name}
                    width={64}
                    height={64}
                    className="rounded-full object-cover"
                />
                <div>
                    <h4 className="text-lg font-semibold leading-tight">
                        {t.name}
                    </h4>
                    <p className="text-sm opacity-80 font-medium">{t.title}</p>
                </div>
            </div>
            <p className="text-sm leading-6">{t.text}</p>
        </div>

    );
};

export default ReviewCard;
