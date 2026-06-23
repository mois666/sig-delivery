import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LayoutDashboard, ClipboardList, Home, Rocket, Wallet, Trophy, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const MobileMenu = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const menuItems = isAdmin ? [
    { name: "Panel", path: "/admin", icon: LayoutDashboard },
    { name: "Usuarios", path: "/users", icon: Users },
    { name: "Ciudades", path: "/cities", icon: Globe },
    { name: "Pedidos", path: "/orders", icon: ClipboardList },
  ] : [
    { name: "Inicio", path: "/home", icon: Home },
    { name: "Actual", path: "/active-delivery", icon: Rocket },
    { name: "Billetera", path: "/wallet", icon: Wallet },
    { name: "Ranking", path: "/ranking", icon: Trophy },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 h-16 bg-background/80 dark:bg-black/55 backdrop-blur-xl border border-default-200/50 dark:border-white/10 rounded-2xl flex items-center justify-around px-2 z-50 shadow-[0_8px_32px_rgba(0,0,0,0.12)]">
      {menuItems.map((item) => {
        const isActive = location.pathname === item.path;
        const Icon = item.icon;
        return (
          <Link
            key={item.path}
            to={item.path}
            className="relative flex flex-col items-center justify-center w-full h-full group"
          >
            {isActive && (
              <motion.div
                layoutId="mobile-active"
                className="absolute inset-0 bg-primary/8 dark:bg-primary/12 rounded-xl mx-1 border border-primary/20"
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
              />
            )}
            
            <motion.div
              animate={{ y: isActive ? -2 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center justify-center relative z-10"
            >
              <Icon 
                className={cn(
                  "w-5 h-5 mb-0.5 transition-all duration-300",
                  isActive 
                    ? "text-primary scale-110 drop-shadow-[0_0_6px_rgba(0,112,240,0.4)]" 
                    : "text-muted-foreground/60 group-hover:text-foreground"
                )} 
              />
              <span 
                className={cn(
                  "text-[9px] font-black uppercase tracking-wider transition-all duration-300",
                  isActive 
                    ? "text-primary font-black" 
                    : "text-muted-foreground/50 group-hover:text-muted-foreground"
                )}
              >
                {item.name}
              </span>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
};
