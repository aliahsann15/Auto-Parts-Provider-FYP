import React from 'react';
import Image from '@/app/components/AppImage';
import { FiCheckCircle } from 'react-icons/fi';

// ThankYouPage component renders the order confirmation UI
const ThankYouPage: React.FC = () => {
  // ----- Demo Data -----
  const orderNumber = '1004';
  const customerName = 'Ahmed Afzal';
  const email = 'ahmedafz1437@gmail.com';

  // Shipping and billing address demo
  const address = {
    line1: 'House no 21, J Block, Eden Executive, 208 Chak Road, Kashmir Pull, Canal Road.',
    city: 'Faisalabad',
    province: 'Punjab',
    postalCode: '38000',
    country: 'Pakistan',
  };

  // Order line items demo
  const items = [
    {
      id: 1,
      name: 'Corolla head lights with focus and Upgraded 5.0 Receiver',
      imageUrl: '/images/placeholder-product.png', // Replace with your asset path
      price: 999,
      quantity: 1,
      sku: 67890
    },
    {
        id: 2,
        name: 'COMSOON Upgraded Bluetooth 5.0 Receiver for Car',
        imageUrl: '/images/placeholder-product-2.png', // ✅ Use your correct path
        price: 7800,
        quantity: 1,
        sku: 67895
      },
      {
        id: 3,
        name: 'Corolla head lights with focus and Upgraded 5.0 Receiver',
        imageUrl: '/images/placeholder-product.png', // Replace with your asset path
        price: 300,
        quantity: 1,
        sku: 67898
      },
      {
        id: 4,
        name: 'COMSOON Upgraded Bluetooth 5.0 Receiver for Car',
        imageUrl: '/images/placeholder-product-2.png', // ✅ Use your correct path
        price: 500,
        quantity: 1,
        sku: 67888
      },
   

  ];

  // Pricing breakdown demo
  const subtotal = 1000;
  const discount = 100;
  const shippingFee = 10;
  const taxes = 135;
  const total = subtotal - discount + shippingFee + taxes;

  return (
    <div className="container mx-auto px-6 py-10">
      {/* ----- Header Section ----- */}
      <div className=" flex flex-row gap-5 mb-6 items-center">
        <FiCheckCircle className='text-5xl text-[#ffa500]'></FiCheckCircle>
        <div>
        {/* Order number */}
        <p className="text-gray-600">Order #{orderNumber}</p>
        {/* Personalized thank-you message */}
        <p className="mt-2 text-xl">Thank you {customerName}!</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ----- Left Column ----- */}
        <div className="md:col-span-2 space-y-6">
          {/* Map Placeholder - integrate a real map here later */}
          <section>
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Map Placeholder</p>
            </div>
            <div className="mt-2 text-xs text-gray-500 bg-white inline-block px-2 py-1 rounded shadow">
              Shipping address: {address.city}, {address.province}
            </div>
          </section>

          {/* Order confirmation message */}
          <section className="p-4 bg-white rounded-lg shadow border-2 border-[#ffa500]">
            <h2 className="font-medium text-lg mb-2">Your order is confirmed</h2>
            <p className="text-gray-600">
              We've accepted your order, and we're getting it ready. A confirmation email has been sent to{' '}
              <span className="text-[#ffa500] underline">
                {email}</span>. Click the below button to track your order.
            </p>
          </section>

          {/* Customer shipping & billing info */}
          <section className=" border-2 border-[#ffa500] p-4 bg-white rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Shipping info */}
            <div>
              <h3 className="font-medium mb-1">Shipping address</h3>
              <p>{customerName}</p>
              <p>{address.line1}</p>
              <p>
                {address.city}, {address.province} {address.postalCode}
              </p>
              <p>{address.country}</p>

              <h3 className="font-medium mt-4 mb-1">Shipping method</h3>
              <p>Standard Shipping</p>
            </div>

            {/* Billing info */}
            <div>
              <h3 className="font-medium mb-1">Billing address</h3>
              <p>{customerName}</p>
              <p>{address.line1}</p>
              <p>
                {address.city}, {address.province} {address.postalCode}
              </p>
              <p>{address.country}</p>

              <h3 className="font-medium mt-4 mb-1">Payment method</h3>
              <p>Cash on Delivery (COD) — ${total.toFixed(2)}</p>
            </div>
              {/* Track Order Button */}
       
          </section>
          <div className='w-full flex gap-5'>
          <button
          type="button"
          className="mt-4 bg-[#ffa500]  text-white font-medium px-4 py-3 rounded"
       
        >
          Contact Support
        </button>
        <button
          type="button"
          className="mt-4 bg-[#ffa500]  text-white font-medium px-4 py-3 rounded"
       
        >
          Track Your Order
        </button></div>
        </div>

        {/* ----- Right Column ----- */}
        <aside className="space-y-4">
          {/* Order items list */}
          <section className="border-2 border-[#ffa500] bg-white rounded-lg shadow p-4">
            {items.map((item) => (
              <div key={item.id} className="border-b border-gray-200 pb-4 flex items-center justify-between mb-4 last:mb-0">
                <div className="w-16 h-16 relative">
                  {/* Product image */}
                  <Image src={item.imageUrl} alt={item.name} layout="fill" objectFit="cover" />
                </div>
                <div className='flex-1 flex-col justify-start'>
                <p className="flex-1 ml-4 mb-2">{item.name}</p>
                <p className="flex-1 text-xs ml-4">SKU: {item.sku}</p></div>
                <span className="inline-block bg-[#ffa500] text-white rounded-full px-2 text-sm mr-1">x{item.quantity}</span>
                <p className="font-semibold">PKR {(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </section>

          {/* Pricing summary */}
          <section className=" border-2 border-[#ffa500] bg-white rounded-lg shadow p-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>PKR {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-red-500">-PKR {discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>PKR {shippingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxes</span>
              <span>PKR {taxes.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>PKR {total.toFixed(2)}</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default ThankYouPage;
