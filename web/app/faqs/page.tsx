// 👉 Importing required modules from Next.js
import Image from "@/app/components/AppImage";
import FaqsAccordion from "../components/faqs/faqs-accordion";

// 👉 Main FAQs Page Component
export default function FaqsPage() {
  // 👉 FAQs data (10 items)
  const faqsData = [
    { question: "What is Autopart Provider?", answer: "Autopart Provider is an online marketplace where you can buy and sell automotive spare parts all across Pakistan." },
    { question: "How do I sell my spare parts?", answer: "Register as a vendor, upload your parts with pricing and details, and wait for admin approval." },
    { question: "Is it free to register?", answer: "Yes, registration is completely free for both buyers and sellers." },
    { question: "How are payments handled?", answer: "Payments are processed via a secure gateway and released after order confirmation." },
    { question: "Can I return an item?", answer: "Yes, within 7 days if it's defective or doesn't match the description." },
    { question: "How long does delivery take?", answer: "2–5 working days based on seller and buyer locations." },
    { question: "Do you offer customer support?", answer: "Yes! Our team is available 24/7 through chat and email." },
    { question: "Can I get installation services?", answer: "Coming soon in major cities of Pakistan!" },
    { question: "Are the parts genuine or replicas?", answer: "Sellers must clearly mention if parts are OEM, genuine, or replicas." },
    { question: "How do I contact a seller?", answer: "Login to message sellers directly through our platform." }
  ];

  return (
    <>
      {/* ✅ Section: FAQ Hero Section */}
      <section className="bg-[#f5f5f5] py-16 px-17.5 md:px-8 lg:px-16">
        {/* ✅ Main container with responsive layout */}
        <div className="max-w-7xl mx-auto flex flex-col-reverse lg:flex-row items-center gap-8">

          {/* ✅ Left Side: Text Content */}
          <div className="w-full lg:w-1/2">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">FAQs</h2>
            <p className="text-gray-700 text-base leading-7">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
              Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
          </div>

          {/* ✅ Right Side: Image / SVG */}
          <div className="w-full lg:w-1/2 flex justify-center">
            {/* ⬇️ Replace the src with your actual SVG path later */}
            <Image
              src="/images/faqs1.png"
              alt="Thinking Person"
              className="w-[320px] h-auto"
              width={320}
              height={320}
            />
          </div>
        </div>
      </section>

      {/* ✅ Accordion FAQ Section */}
      <FaqsAccordion faqs={faqsData} />
    </>
  );
}
