import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Bike } from "lucide-react";
import { Button } from '@heroui/react';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-8"
      >
        <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center">
          <Bike className="w-12 h-12 text-muted-foreground" />
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8"
      >
        <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
        <p className="text-xl text-foreground mb-2">Página no encontrada</p>
        <p className="text-muted-foreground">La página que buscas no existe</p>
      </motion.div>

      <Button asChild color="primary" className="h-12 px-6">
        <Link to="/">
          <Home className="w-5 h-5 mr-2" />
          Volver al inicio
        </Link>
      </Button>
    </div>
  );
};

export default NotFound;
