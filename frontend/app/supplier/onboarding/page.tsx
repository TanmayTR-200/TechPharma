"use client";


import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function SellerOnboardingPage() {
  return (
    <div className="min-h-screen">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-serif font-bold mb-4">Start Selling on TradeMart</h1>
          <p className="text-xl text-muted-foreground">
            Join thousands of successful suppliers reaching global customers
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card>
            <CardHeader>
              <CardTitle>Basic Plan</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold mb-4">—</div>
                <p className="text-sm text-muted-foreground mb-4">Plan details will be available after completing a verified payment.</p>
                <ul className="space-y-2">
                  <li className="text-sm text-muted-foreground">Feature details hidden</li>
                </ul>
                <Button className="w-full mt-6" disabled aria-disabled title="Requires payment">Requires payment</Button>
            </CardContent>
          </Card>

          <Card className="border-primary">
            <CardHeader>
              <CardTitle>Professional</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold mb-4">—</div>
                <p className="text-sm text-muted-foreground mb-4">Plan details will be available after completing a verified payment.</p>
                <ul className="space-y-2">
                  <li className="text-sm text-muted-foreground">Feature details hidden</li>
                </ul>
                <Button className="w-full mt-6" variant="default" disabled aria-disabled title="Requires payment">Requires payment</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enterprise</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold mb-4">—</div>
                <p className="text-sm text-muted-foreground mb-4">Plan details will be available after completing a verified payment.</p>
                <ul className="space-y-2">
                  <li className="text-sm text-muted-foreground">Feature details hidden</li>
                </ul>
                <Button className="w-full mt-6" variant="outline" disabled aria-disabled title="Contact your account manager after payment">Contact Sales</Button>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
