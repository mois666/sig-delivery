"use client";


import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useNavigate } from "react-router-dom";

export function Providers({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (

    <NextThemesProvider attribute="class" defaultTheme="dark">
      {children}
    </NextThemesProvider>
  );
}
