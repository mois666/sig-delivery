import { Link, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { LayoutDashboard, Package, Map, ClipboardList, Home, Rocket, Wallet, Trophy, Users, Globe } from "lucide-react";
import { motion } from "framer-motion";

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
    <div className="fixed bottom-4 left-4 right-4 h-16 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center justify-around px-2 z-50 shadow-2xl">
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
                className="absolute inset-0 bg-primary/10 rounded-xl mx-1"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <Icon className={`w-5 h-5 mb-1 transition-all duration-300 ${isActive ? "text-primary scale-110" : "text-white/40 group-hover:text-white"
              }`} />
            <span className={`text-[9px] font-black uppercase tracking-tighter transition-all duration-300 ${isActive ? "text-primary" : "text-white/30 group-hover:text-white/60"
              }`}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </div>
  );
};
