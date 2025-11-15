import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTheme } from "../lib/getTheme";

export default function SplashScreen({ oncePerSession = true, minMs = 3000 }) {
  const [show, setShow] = useState(true);
  const [theme, setTheme] = useState({ 
    logo: null, 
    primary: "#0E0E11", 
    accent: "#E1467C", 
    welcome: "AI Operations Platform" 
  });

  const seen = useMemo(() => 
    oncePerSession && sessionStorage.getItem("splash_seen") === "1", 
    [oncePerSession]
  );

  useEffect(() => {
    let timer;
    (async () => {
      const th = await getTheme({});
      setTheme(th);
      
      if (seen) {
        setShow(false);
        return;
      }
      
      timer = setTimeout(() => {
        setShow(false);
        if (oncePerSession) {
          sessionStorage.setItem("splash_seen", "1");
        }
      }, minMs);
    })();
    
    return () => clearTimeout(timer);
  }, [seen, oncePerSession, minMs]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.25, 1, 0.5, 1] } }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: theme.primary, color: "#fff" }}
      >
        {/* Accent sweep */}
        <motion.div
          initial={{ x: "-100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="absolute top-0 left-0 h-[2px] w-full"
          style={{ 
            background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` 
          }}
        />

        {/* Logo / Wordmark */}
        <div className="flex flex-col items-center gap-3">
          {theme.logo ? (
            <motion.img
              src={theme.logo}
              alt="logo"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="h-14 w-auto object-contain"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-white/90 tracking-[0.35em] uppercase text-base"
            >
              ENTIRECAFM
            </motion.div>
          )}
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.25 }}
            className="text-[11px] text-gray-400"
          >
            {theme.welcome}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}