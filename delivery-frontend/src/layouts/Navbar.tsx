"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Avatar, Button, Badge, Dropdown, Description, Header, Label, Separator, Kbd } from "@heroui/react";
import { Bars, Pencil, SquarePlus, TrashBin } from "@gravity-ui/icons";
import { useAuthStore } from "@/stores/authStore";
import { useSocketStore } from "@/stores/socketStore";
import {
  Bell, Search, LogOut, User, Bike, Sun, Moon,
  LayoutDashboard, ClipboardList, Home, Rocket, Wallet, Trophy, Users, Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export const TopNavbar = () => {
  const { user, logout, isAuthenticated } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { isConnected } = useSocketStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const mobileMenuItems = isAdmin ? [
    { name: "Dashboard", path: "/admin", icon: LayoutDashboard },
    { name: "Usuarios", path: "/users", icon: Users },
    { name: "Ciudades", path: "/cities", icon: Globe },
    { name: "Pedidos", path: "/orders", icon: ClipboardList },
    { name: "Billetera", path: "/user-wallets", icon: Wallet },
    { name: "Ranking", path: "/ranking", icon: Trophy },
  ] : [
    { name: "Inicio", path: "/home", icon: Home },
    { name: "Entrega Activa", path: "/active-delivery", icon: Rocket },
    { name: "Billetera", path: "/wallet", icon: Wallet },
    { name: "Ranking", path: "/ranking", icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-[50] w-full h-16 bg-background/80 backdrop-blur-md border-b border-divider transition-all duration-300">
      <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">

        {/* Left Section: Logo & Search */}
        <div className="flex items-center gap-4 md:gap-8 flex-1">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(isAdmin ? '/admin' : '/home')}>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Bike className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-sm md:text-lg font-black font-display text-foreground tracking-tighter uppercase">
                {import.meta.env.VITE_NAME_APP || 'Depedidos'}
              </span>
              {isAuthenticated && user?.city?.name && (
                <span className="text-[9px] md:text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                  {user.city.name}
                </span>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center relative max-w-sm w-full group">
            <Search className="absolute left-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar..."
              className={cn(
                "w-full h-9 pl-9 pr-4 bg-default-100 border-none rounded-xl text-sm outline-none transition-all",
                "focus:bg-default-200"
              )}
            />
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center gap-2 md:gap-4">

          {/* Theme Switcher */}
          <Button
            isIconOnly
            variant="light"
            onPress={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </Button>

          <Badge.Anchor>
            <Button
              isIconOnly
              variant="light"
              className="text-muted-foreground"
            >
              <Bell className="w-5 h-5" />
            </Button>
            <Badge color="danger" size="sm">
              +99
            </Badge>
          </Badge.Anchor>

          {/* User Profile - Redirige a /profile en click */}
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-default-100 transition-all outline-none"
            aria-label="Perfil"
          >
            <div className="relative flex-shrink-0">
              <Avatar className="w-8 h-8" color="primary">
                <Avatar.Fallback>
                  <User className="w-4 h-4" />
                </Avatar.Fallback>
              </Avatar>
              <span
                className={cn(
                  "absolute right-0 bottom-0 size-2.5 rounded-full ring-2 ring-background",
                  isConnected ? "bg-green-500" : "bg-red-500"
                )}
              />
            </div>
          </button>

          {/* Dropdown de opciones de cuenta y navegación en móviles */}
          <Dropdown>
            <Button isIconOnly aria-label="Menu" variant="secondary" className="md:hidden text-muted-foreground">
              <Bars className="outline-none" />
            </Button>
            <Dropdown.Popover className="min-w-[220px]">
              <Dropdown.Menu
                onAction={(key) => {
                  if (key === 'profile') navigate('/profile');
                  else if (key === 'logout') logout();
                  else if (typeof key === 'string' && key.startsWith('/')) navigate(key);
                }}
              >
                <Dropdown.Section>
                  <Header>Cuenta</Header>
                  <Dropdown.Item id="user-info" textValue={user?.name || "Usuario"}>
                    <div className="flex flex-col">
                      <Label>{user?.name}</Label>
                      <Description>{user?.email || 'Sin correo registrado'}</Description>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Header>Navegación</Header>
                  {mobileMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Dropdown.Item key={item.path} id={item.path} textValue={item.name}>
                        <div className="flex h-8 items-start justify-center pt-px">
                          <Icon className="size-4 shrink-0 text-muted" />
                        </div>
                        <div className="flex flex-col">
                          <Label>{item.name}</Label>
                        </div>
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Header>Acciones</Header>
                  <Dropdown.Item id="profile" textValue="Perfil">
                    <div className="flex h-8 items-start justify-center pt-px">
                      <Pencil className="size-4 shrink-0 text-muted" />
                    </div>
                    <div className="flex flex-col">
                      <Label>Perfil</Label>
                      <Description>Ver mis datos y nivel</Description>
                    </div>
                    <Kbd className="ms-auto" slot="keyboard" variant="light">
                      <Kbd.Abbr keyValue="command" />
                      <Kbd.Content>P</Kbd.Content>
                    </Kbd>
                  </Dropdown.Item>
                </Dropdown.Section>
                <Separator />
                <Dropdown.Section>
                  <Header>Zona de peligro</Header>
                  <Dropdown.Item id="logout" textValue="Cerrar Sesión" variant="danger">
                    <div className="flex h-8 items-start justify-center pt-px">
                      <TrashBin className="size-4 shrink-0 text-danger" />
                    </div>
                    <div className="flex flex-col">
                      <Label>Cerrar Sesión</Label>
                      <Description>Finalizar sesión actual</Description>
                    </div>
                    <Kbd className="ms-auto" slot="keyboard" variant="light">
                      <Kbd.Abbr keyValue="command" />
                      <Kbd.Abbr keyValue="shift" />
                      <Kbd.Content>Q</Kbd.Content>
                    </Kbd>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

      </div>
    </header>
  );
};
