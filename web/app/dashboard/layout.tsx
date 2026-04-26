import { Sidebar } from "@/components/layout/sidebar";
import { getCurrentBrand } from "@/actions/brands";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { brand, agentCount } = await getCurrentBrand();

  return (
    <div className="grid grid-cols-[232px_1fr] min-h-screen bg-bg">
      <Sidebar brand={brand} agentCount={agentCount} />
      <main className="flex flex-col min-w-0">{children}</main>
    </div>
  );
}
