"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"

const faqs = [
  {
    question: "How do I list my products on TechPharma?",
    answer: "Create a supplier account, click 'Add Product' in your dashboard, and fill in the product name, description, price, category, and upload images. Your product will be visible to buyers immediately after publishing."
  },
  {
    question: "How do I contact a supplier?",
    answer: "Click 'Get quote' on any product card or 'Contact seller' on the product detail page. This opens a chat with the supplier where you can negotiate pricing, ask questions, and place orders."
  },
  {
    question: "How does ordering work?",
    answer: "Add products to your cart, choose your payment method (Cash on Delivery or online payment), and place the order. The supplier receives your order and processes it. You can track order status in your dashboard."
  },
  {
    question: "Is my supplier information public?",
    answer: "Your real name is only visible to logged-in users. Logged-out visitors see 'Seller' instead of your name, protecting your identity until a buyer is serious enough to create an account."
  },
  {
    question: "How do I edit or delete my products?",
    answer: "Go to your dashboard, navigate to Products, and click 'Edit' or 'Delete' on any product you own. Only you can modify your own listings - other users see 'View details' and 'Add to cart' instead."
  },
  {
    question: "What categories are available?",
    answer: "Currently we support Electronics, Machinery, Safety, Tools, and Lighting categories. New categories can be added as the platform grows - contact us if you need a specific category for your products."
  },
]

export function FAQSection() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section className="py-16 px-6 sm:px-8 mt-8 relative z-10">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-2">FAQs</p>
          <h2 className="font-display text-3xl font-bold text-foreground">Frequently asked questions</h2>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-0 border border-border overflow-hidden">
          {/* Left: Questions list */}
          <div className="bg-foreground text-background p-5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-background/50 mb-3">Questions</p>
            <div className="space-y-1">
              {faqs.map((faq, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-l-2 ${
                    activeIndex === idx
                      ? 'border-accent text-background bg-background/10'
                      : 'border-transparent text-background/70 hover:text-background hover:bg-background/5'
                  }`}
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Answer */}
          <div className="bg-card p-8 flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-3">Answer</p>
            <p className="font-display text-base text-foreground mb-4">{faqs[activeIndex].question}</p>
            <div className="bg-background border border-border p-5 flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed">{faqs[activeIndex].answer}</p>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <div className="flex h-8 w-8 items-center justify-center border border-border">
                <MessageCircle className="h-4 w-4 text-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Still have questions? <a href="/about" className="text-foreground underline">Get in touch</a></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
