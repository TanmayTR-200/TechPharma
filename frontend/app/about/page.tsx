"use client";


import { Footer } from "@/components/footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-serif font-bold mb-8">About TradeMart</h1>
        <div className="prose prose-lg max-w-none">
          <p className="text-xl mb-6">
            TradeMart is your premier B2B marketplace connecting businesses with trusted suppliers worldwide.
          </p>
          <h2 className="text-2xl font-bold mt-8 mb-4">Our Mission</h2>
          <p>
            To create a seamless and reliable platform that facilitates business connections and trade relationships globally.
          </p>
          <h2 className="text-2xl font-bold mt-8 mb-4">Why Choose TradeMart?</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Verified suppliers and quality products</li>
            <li>Secure transactions and payment protection</li>
            <li>24/7 customer support</li>
            <li>Global shipping and logistics solutions</li>
            <li>Competitive pricing and bulk discounts</li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
