import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getTheme } from "./lib/getTheme";

export default function SplashScreen({ oncePerSession = true, minMs = 3000 }) {
  const [show, setShow] = useState(true);
  const [theme, setTheme] = useState({ 
    logo: null, 
    primary: "#0E0E11", 
    accent: "#E1467C", 
    welcome: "AI Operations Platform" 
  });

  // Check if splash was already seen this session
  const alreadySeen = useMemo(() => 
    oncePerSession && sessionStorage.getItem("splash_seen") === "1", 
    [oncePerSession]
  );

  useEffect(() => {
    if (alreadySeen) {
      setShow(false);
      return;
    }

    let mounted = true;
    const startTime = Date.now();

    (async () => {
      try {
        const th = await getTheme({});
        if (mounted) {
          setTheme(th);
        }
      } catch (error) {
        console.error('Theme load error:', error);
      }

      // Wait for full 3 seconds from start
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minMs - elapsed);

      setTimeout(() => {
        if (mounted) {
          setShow(false);
          if (oncePerSession) {
            sessionStorage.setItem("splash_seen", "1");
          }
        }
      }, remaining);
    })();

    return () => {
      mounted = false;
    };
  }, [alreadySeen, oncePerSession, minMs]);

  if (alreadySeen || !show) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="splash-screen"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] } }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ 
          background: theme.primary,
          backgroundImage: `linear-gradient(145deg, ${theme.primary} 0%, #191921 100%)`
        }}
      >
        {/* Animated Pink Accent Line - Always Visible */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ 
            scaleX: 1,
            opacity: [0, 1, 1, 0],
            x: ["0%", "0%", "0%", "100%"]
          }}
          transition={{ 
            duration: 2.5,
            times: [0, 0.1, 0.7, 1],
            ease: [0.22, 1, 0.36, 1]
          }}
          className="absolute top-0 left-0 right-0 h-[3px] origin-left"
          style={{ 
            background: `linear-gradient(90deg, transparent 0%, ${theme.accent} 50%, transparent 100%)`,
            boxShadow: `0 0 20px ${theme.accent}80`
          }}
        />

        {/* Content Container */}
        <div className="flex flex-col items-center gap-4">
          {/* Logo or Brand Name */}
          {theme.logo ? (
            <motion.img
              src={theme.logo}
              alt="logo"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.8,
                delay: 0.2,
                ease: [0.25, 1, 0.5, 1]
              }}
              className="h-16 w-auto object-contain"
            />
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.8,
                delay: 0.2,
                ease: [0.25, 1, 0.5, 1]
              }}
              className="text-white tracking-[0.35em] uppercase text-xl font-bold"
              style={{ 
                textShadow: `0 0 30px ${theme.accent}40`
              }}
            >
              ENTIRECAFM
            </motion.div>
          )}
          
          {/* Welcome Text */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.7, y: 0 }}
            transition={{ 
              delay: 0.5,
              duration: 0.6,
              ease: [0.25, 1, 0.5, 1]
            }}
            className="text-sm text-gray-300 tracking-wider font-light"
          >
            {theme.welcome}
          </motion.div>

          {/* Animated Loading Dots */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="flex gap-2 mt-2"
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut"
                }}
                className="w-2 h-2 rounded-full"
                style={{ 
                  backgroundColor: theme.accent,
                  boxShadow: `0 0 10px ${theme.accent}80`
                }}
              />
            ))}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}