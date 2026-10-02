"use client";

// 👉 Importing React and useState hook
import React, { useState } from "react";

// 👉 Define the type for each FAQ item
type FAQItem = {
  question: string;
  answer: string;
};

// 👉 Define props for the reusable component
interface FaqsAccordionProps {
  faqs: FAQItem[];
}

// 👉 Reusable FAQs Accordion Component
const FaqsAccordion: React.FC<FaqsAccordionProps> = ({ faqs }) => {
  // 👉 State to track which FAQ is currently open
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    // ✅ Section: FAQs Accordion Starts
    <section className="py-16 px-4 md:px-8 lg:px-16 bg-white">
      <div className="max-w-4xl mx-auto">
        {/* 👉 Main Heading */}
        <h2 className="text-3xl font-bold text-center text-black mb-10">
          Frequently Asked Questions
        </h2>

        {/* 👉 Loop through each FAQ item */}
        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={index}
                className="border border-[#FFA500] rounded-lg shadow-md transition-all duration-300"
              >
                {/* 👉 Question Header */}
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className={`w-full flex justify-between items-center text-left px-6 py-4 transition-all duration-300 ${
                    isOpen ? "bg-[#FFA500] text-white rounded-t-[7px]" : "bg-white hover:bg-[#FFF3E0] rounded-lg"
                  } `}
                >
                  <span className={`text-lg font-medium ${isOpen ? "text-white" : "text-black"}`}>
                    {faq.question}
                  </span>

                  {/* 👉 Dropdown Arrow Icon */}
                  <svg
                    className={`w-5 h-5 transform transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-white" : "rotate-0 text-black"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* 👉 Answer Section (Only shows when open) */}
                {isOpen && (
                  <div className="rounded-b-[8px] px-6 py-4 text-black bg-white">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
    // ✅ Section: FAQs Accordion Ends
  );
};

export default FaqsAccordion;
