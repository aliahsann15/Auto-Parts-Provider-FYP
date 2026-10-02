"use client";

import { useCart } from "@/app/context/cart-context";
import { useState } from "react";
import { FiLoader } from "react-icons/fi";
import { toast } from "sonner";

type Props = {
    productName: string;
    productId: string;
    stock: number;
    quantity?: number;
};

export default function AddToCart({ productName, productId, stock, quantity = 1 }: Props) {
    const { addToCart, setIsCartOpen } = useCart();
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = async () => {
        const session = await fetch('/api/auth/session').then(res => res.json());
        
        if (!session?.user) {
            toast.error("Please log in to add items to cart");
            return;
        }

        try {
            setIsAdding(true);
            await addToCart(productId, quantity);
            toast(`${productName} added to cart`);
            setIsCartOpen(true)

        } catch (err) {
            toast.error("Failed to add to cart");
        } finally {
            setIsAdding(false);
        }
    };

    // Deterministic markup on server: initial inCart=false, isClient=false
    return (
        <button
            type="button"
            onClick={handleAdd}
            disabled={stock < 1 || isAdding}
            className="bg-primary disabled:opacity-50 cursor-pointer  disabled:cursor-not-allowed hover:bg-primary-hover text-white text-sm w-full py-[10px] rounded flex justify-center items-center gap-2"
        >
            {isAdding ? (
                <>
                    <FiLoader className="animate-spin" />
                    Adding...
                </>
            ) : (
                "Add to Cart"
            )}
        </button>
    );
}
