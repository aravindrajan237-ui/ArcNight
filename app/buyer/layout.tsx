import { ToastProvider } from "@/components/ui/Toast";
import { CartProvider } from "@/lib/cart";
import { BuyerNav } from "@/components/buyer/BuyerNav";
import { DemoBar } from "@/components/demo/DemoControls";

/** Buyer shell: desktop sidebar + mobile bottom nav + cart. Role-gated by middleware. */
export default function BuyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <ToastProvider>
        <DemoBar />
        <div className="flex min-h-screen bg-surface">
          <BuyerNav />
          <div className="flex-1 pb-[76px] md:pb-0">{children}</div>
        </div>
      </ToastProvider>
    </CartProvider>
  );
}
