import type { Metadata } from "next";
import { CartProvider } from "@/app/context/cart-context";
import { Montserrat } from "next/font/google";
import "./globals.css";
import AppProviders from "./providers";
import "swiper/css";
import "swiper/css/navigation";
import Header from "./components/global/header";
import Footer from "./components/global/footer";
import { Toaster } from "./components/ui/sonner";

const geistMono = Montserrat({
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: "Auto Parts Provider",
  description: "Get rare auto parts in one touch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistMono.className} ${geistMono} antialiased`}
        suppressHydrationWarning
      >
        <AppProviders>
          <CartProvider>
            <Header />
            {children}
            {/* <AppProviders>{children}</AppProviders> */}
            <Footer />
            {/* Global toast root */}
            <Toaster position="bottom-right" />
          </CartProvider>
        </AppProviders>
      </body>
    </html>
  );
}
