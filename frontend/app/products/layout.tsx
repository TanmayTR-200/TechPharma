import DashboardLayout from "@/components/dashboard-layout"
import { ProtectedRoute } from "@/components/protected-route"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <DashboardLayout>{children}</DashboardLayout>
  );
}
