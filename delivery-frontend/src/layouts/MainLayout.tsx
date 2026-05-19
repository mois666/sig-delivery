import { useLocation } from "react-router-dom";
import { Sidebar } from "@/layouts/Sidebar";
import { TopNavbar } from "@/layouts/Navbar";
import { MobileMenu } from "@/layouts/MobileMenu";
import { useAuthStore } from "@/stores/authStore";
import { motion, AnimatePresence } from "framer-motion";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isLoginPage = location.pathname === "/";
  const { isAuthenticated } = useAuthStore();

  if (isLoginPage || !isAuthenticated) {
    return <div className="min-h-screen bg-background text-foreground">{children}</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground selection:bg-primary/30">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {/* Background Gradients for Main Area */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[100px] pointer-events-none" />
        
        {/* Top Navbar */}
        <TopNavbar />

        {/* Main Content Area with Page Transitions */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Mobile Bottom Menu */}
        <div className="md:hidden">
          <MobileMenu />
        </div>
      </div>
    </div>
  );
};
