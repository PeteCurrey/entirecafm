import React, { useState, useEffect } from "react";
import { Download, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed or dismissed
    const dismissed = localStorage.getItem('pwa_install_dismissed');
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    if (dismissed || isStandalone) return;

    // Detect iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    if (iOS) {
      // Show iOS instructions after delay
      setTimeout(() => setShowPrompt(true), 3000);
      return;
    }

    // Listen for install prompt on Android/Chrome
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50"
      >
        <div className="glass-panel-strong rounded-2xl p-4 border border-[rgba(255,255,255,0.1)] shadow-xl">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-[#CED4DA] hover:text-white"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E1467C] to-[#C13666] flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-1">Install EntireCAFM</h3>
              
              {isIOS ? (
                <div className="text-xs text-[#CED4DA] space-y-1">
                  <p>To install this app on your iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 mt-2">
                    <li>Tap the <strong>Share</strong> button</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
                    <li>Tap <strong>Add</strong> to confirm</li>
                  </ol>
                </div>
              ) : (
                <>
                  <p className="text-xs text-[#CED4DA] mb-3">
                    Get quick access, offline support, and push notifications
                  </p>
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="bg-[#E1467C] hover:bg-[#E1467C]/90 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Install App
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}