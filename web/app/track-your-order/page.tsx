// ✅ page.tsx for Track Order Page in Next.js with Tailwind CSS
// 👇 Required to use React components
"use client";
import React, { useState } from "react";

// ✅ Section: Track Order Page Starts
const TrackOrderPage = () => {
  // 👇 State to hold the tracking number input
  const [trackingNumber, setTrackingNumber] = useState("");

  return (
    // ✅ Whole Page Container
    <div className="min-h-screen bg-white">

      {/* ✅ Section 1: Banner Starts */}
      <div className="relative w-full h-[400px] bg-black text-white flex items-center justify-center">
        {/* Background image overlay */}
        <div className="absolute inset-0 bg-[url(/images/track1.png)] bg-cover bg-center opacity-40"></div>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black opacity-50"></div>

        {/* Text & Icon in Front */}
        <div className="relative z-10 text-center">
          <p className="text-sm uppercase tracking-widest">Track & Trace</p>
          <h1 className="text-4xl font-bold">With Ease</h1>
        </div>
      </div>
      {/* ✅ Section 1: Banner Ends */}

      {/* ✅ Section 2: Track Input Form Starts */}
      <div className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-black mb-4">
            Track Your Shipment
          </h2>
          <p className="text-gray-600 mb-6">
            Enter your tracking number or Reference Number to track your shipment
          </p>

          {/* Input Field and Button */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <input
              type="text"
              placeholder="Tracking Number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              className="w-full md:w-[60%] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFA500]"
            />
            <button className="px-6 py-2 bg-[#FFA500] hover:bg-yellow-600 text-white font-medium rounded-md transition-all">
              Track Shipment
            </button>
          </div>
        </div>
      </div>
      {/* ✅ Section 2: Track Input Form Ends */}

      {/* ✅ Section 3: Shipment Info Cards Starts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto px-4 pb-16">
        {/* 👉 Left Card: Booking Details */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-2">Shipment Booking Details</h3>
          <p className="text-sm text-gray-700">Tracking Number</p>
          <h4 className="font-semibold mt-4 mb-2">Shipment Details</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Agent Reference Number:</li>
            <li>Origin</li>
            <li>Booking Date</li>
          </ul>
        </div>

        {/* 👉 Right Card: Track Summary */}
        <div className="bg-gray-100 p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-2">Shipment Track Summary</h3>
          <p className="text-sm text-gray-700">Current Status.</p>
        </div>
      </div>
      {/* ✅ Section 3: Shipment Info Cards Ends */}

    </div>
  );
};

export default TrackOrderPage;
// ✅ Track Order Page Ends
