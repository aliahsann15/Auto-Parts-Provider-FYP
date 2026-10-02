import Image from "@/app/components/AppImage";
import Link from "next/link";

export default function Footer() {
    return (
        <footer>
            <div className="px-[5%] text-white flex py-20 bg-[#171717]">
                <div className="pr-8 w-1/3 flex flex-col gap-[30px]">
                    <Image src="/images/logo-white.png" width={200} height={78} alt="Logo" />
                    <h3 className="text-[18px] font-bold">Auto Parts Provider</h3>
                    <p>Find the right rare auto parts for your cars on one tap.</p>
                    <a className="text-[#ffa500] font-bold" href="mailto:info@autopartsprovider.com">info@autopartsprovider.com</a>
                </div>
                <div className="flex flex-col items-stretch pl-[60px] w-2/3 justify-between ">
                    <div className="flex ">
                        <div className="w-2/4 flex-col flex gap-5 ">
                        <h4 className="font-bold">Need Help?</h4>
                            <a className="text-[24px] font-bold">(+92) 303 924 5137</a>
                            <div>
                                <p className="text-[rgba(255,255,255,0.6)]">Monday - Friday: 9:00 - 20:00</p>
                                <p className="text-[rgba(255,255,255,0.6)]">Saturday: 11:00 - 15:00</p>
                            </div>
                            <a className="text-[#ffa500] font-bold">support@autopartsprovider.com</a>
                        </div>
                        <div className="w-1/4 flex flex-col gap-4">
                            <h4 className="font-bold">Customer Service</h4>
                            <ul className="text-[14px] ">
                                <li className="mb-2 ">Help Center</li>
                                <li className="mb-2 ">My account</li>
                                <li className="mb-2 ">Track products</li>
                                <li className="mb-2 ">My orders</li>
                                <li className="mb-2 "><Link href="/faqs">FAQs</Link></li>
                                <li>Return Policy</li>
                            </ul>
                        </div>
                        <div className="w-1/4 flex flex-col gap-4">
                            <h4 className="font-bold">Store Information</h4>
                            <ul className="text-[14px]">
                                <li className="mb-2 ">About Auto Parts Provider</li>
                                <li className="mb-2 ">Bestsellers</li>
                                <li className="mb-2 ">Latest products</li>
                                <li className="mb-2 ">New Discounts</li>
                                <li className="mb-2 ">Sale Products</li>
                                <li>Affiliate Program</li>
                            </ul>
                        </div>
                    </div>
                    <div className="flex">
                        <div className="w-1/2 flex flex-col items-start gap-4">
                            <h4 className="font-bold">Download app on mobile</h4>
                            <div className="flex gap-1">
                                <Image alt="App store" width={116} height={38} src="/images/app-store.png" />
                                <Image alt="Google play store" width={116} height={38} src="/images/google-play.webp" />
                            </div>
                        </div>
                        <div className="w-1/2 flex items-end">
                            <Image src="/images/payment-methods.png" width={364} height={32} alt="Payment methods" />
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
