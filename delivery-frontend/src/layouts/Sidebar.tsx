import { Link, useLocation } from "react-router-dom";
import { Button, cn, Tooltip } from "@heroui/react";
import { useAuthStore } from "@/stores/authStore";
import {
  LayoutDashboard, Package, Map, ClipboardList,
  Home, Rocket, Wallet, Trophy, LogOut,
  Settings, ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

export const Sidebar = () => {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const menuItems = isAdmin ? [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Entregas", path: "/delivery", icon: Package },
    { name: "Zonas", path: "/zone", icon: Map },
    { name: "Pedidos", path: "/orders", icon: ClipboardList },
  ] : [
    { name: "Inicio", path: "/home", icon: Home },
    { name: "Entrega Activa", path: "/active-delivery", icon: Rocket },
    { name: "Billetera", path: "/wallet", icon: Wallet },
    { name: "Ranking", path: "/ranking", icon: Trophy },
  ];

  return (
    <aside className="w-72 h-full bg-background border-r border-divider flex flex-col z-20 relative overflow-hidden transition-colors duration-300">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Rocket className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black font-display text-foreground tracking-tighter leading-none">
            DRIVE<span className="text-primary">CORE</span>
          </h1>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-4 mb-4 text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
          Menu Principal
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="block group"
            >
              <motion.div
                whileHover={{ x: 4 }}
                className={cn(
                  "flex items-center justify-between gap-3 px-4 h-12 rounded-2xl transition-all duration-300 relative overflow-hidden",
                  isActive
                    ? "bg-primary shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-default-100"
                )}
              >
                <div className="flex items-center gap-3 relative z-10">
                  <Icon className={cn("w-5 h-5 transition-colors", isActive ? "text-blue-500" : "group-hover:text-primary")} />
                  <span className="font-bold text-sm tracking-tight">{item.name}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 relative z-10 opacity-60" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 mt-auto space-y-4">
        {/* User Card */}
        <div className="p-4 rounded-2xl bg-default-50 border border-divider flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-default-200 overflow-hidden">
            {user?.avatar ? <img src={user.avatar} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground font-bold">{user?.name?.charAt(0)}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{user?.name}</p>
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{user?.role}</p>
          </div>
        </div>

        <Button
          fullWidth
          variant="ghost"
          onPress={logout}
          className="h-12 rounded-2xl text-muted-foreground hover:text-danger hover:bg-danger/10 font-bold justify-start px-4 gap-3 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </Button>
      </div>
    </aside>
  );
};
