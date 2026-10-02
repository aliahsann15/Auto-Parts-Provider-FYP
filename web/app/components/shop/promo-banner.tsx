export default function PromoBanner () {
    return (<section className="mx-auto py-10">
        <div className="relative rounded-lg overflow-hidden grid grid-cols-1 md:grid-cols-2 items-center shadow-lg">
          <img
            src="/images/tools2.png"
            alt="Promo"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/80 z-0" />
          <div className="relative text-white p-6 md:p-12 z-10 max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-bold leading-snug mb-4">
              Get the Right Part At the Right Price For the Comfort of Your
              Vehicle
            </h2>
            <p className="text-sm md:text-base text-gray-300 mb-6">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </p>
            <button className="bg-[#FFA500] hover:bg-yellow-600 transition text-white px-6 py-2 rounded font-medium text-sm">
              Shop Now
            </button>
          </div>
          <div className="hidden md:block h-full z-10" />
        </div>
      </section>)
}