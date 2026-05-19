"use client";

import { Avatar, Dropdown, Button, Description, Header, Kbd, Label, Separator, Badge } from "@heroui/react";
import { useAuthStore } from "@/stores/authStore";
import { useSocketStore } from "@/stores/socketStore";
import { Bell, Search, Settings, LogOut, User, Rocket, Menu, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

export const TopNavbar = () => {
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const { isConnected } = useSocketStore();

  return (
    <header className="sticky top-0 z-[40] w-full h-16 bg-background/80 backdrop-blur-md border-b border-divider transition-all duration-300">
      <div className="h-full max-w-[1920px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        
        {/* Left Section: Logo & Search */}
        <div className="flex items-center gap-4 md:gap-8 flex-1">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-black font-display text-foreground tracking-tighter hidden sm:block">DRIVECORE</span>
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

          {/* User Profile */}
          <Dropdown>
            <button className="flex items-center gap-2 p-1 rounded-full hover:bg-default-100 transition-all outline-none">
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
              <div className="hidden sm:flex flex-col items-start mr-2">
                <span className="text-xs font-bold text-foreground leading-none">{user?.name}</span>
                <span className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">
                  {user?.role}
                </span>
              </div>
            </button>

            <Dropdown.Popover className="min-w-[200px] bg-content1 border border-divider rounded-2xl p-2 shadow-xl">
              <Dropdown.Menu onAction={(key) => console.log(key)}>
                <Dropdown.Section>
                  <Header className="text-[10px] font-black text-primary uppercase tracking-widest px-2 pb-2">Cuenta</Header>
                  <Dropdown.Item id="user-info" textValue="user info">
                    <div className="flex flex-col">
                      <Label className="text-foreground font-bold">{user?.name}</Label>
                      <Description className="text-muted-foreground text-[10px]">{user?.email}</Description>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
                
                <Separator className="bg-divider my-2" />
                
                <Dropdown.Section>
                  <Dropdown.Item id="profile" textValue="Perfil" href="/profile">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-primary" />
                      <Label className="text-foreground">Perfil</Label>
                    </div>
                  </Dropdown.Item>
                  <Dropdown.Item id="settings" textValue="Configuración">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <Label className="text-foreground">Ajustes</Label>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>

                <Separator className="bg-divider my-2" />

                <Dropdown.Section>
                  <Dropdown.Item 
                    id="logout" 
                    textValue="Salir" 
                    variant="danger"
                    onPress={logout}
                    className="text-danger"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      <Label>Cerrar Sesión</Label>
                    </div>
                  </Dropdown.Item>
                </Dropdown.Section>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>

          <Button isIconOnly variant="light" className="md:hidden text-muted-foreground">
            <Menu className="w-5 h-5" />
          </Button>
        </div>

      </div>
    </header>
  );
};
