import React from "react";
import { Button } from "@/components/ui/button";

// Large touch-friendly button
export function TouchButton({ children, className = "", ...props }) {
  return (
    <Button
      className={`min-h-[48px] text-base active:scale-[0.98] transition-transform ${className}`}
      {...props}
    >
      {children}
    </Button>
  );
}

// Swipeable card container
export function SwipeCard({ children, onSwipeLeft, onSwipeRight, className = "" }) {
  const [touchStart, setTouchStart] = React.useState(null);
  const [touchEnd, setTouchEnd] = React.useState(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={className}
    >
      {children}
    </div>
  );
}

// Pull to refresh component
export function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const containerRef = React.useRef(null);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      containerRef.current.startY = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (!containerRef.current.startY) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - containerRef.current.startY;
    
    if (distance > 0 && distance < 100) {
      setPullDistance(distance);
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      await onRefresh();
      setIsRefreshing(false);
    }
    setPullDistance(0);
    containerRef.current.startY = null;
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {pullDistance > 0 && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center transition-all"
          style={{ height: `${pullDistance}px` }}
        >
          <div className={`w-6 h-6 border-2 border-[#E1467C] border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} />
        </div>
      )}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 ? 'transform 0.3s' : 'none' }}>
        {children}
      </div>
    </div>
  );
}

// Bottom sheet modal
export function BottomSheet({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full glass-panel-strong rounded-t-3xl border-t border-[rgba(255,255,255,0.08)] max-h-[90vh] overflow-hidden animate-slide-up">
        <div className="sticky top-0 glass-panel-strong border-b border-[rgba(255,255,255,0.08)] p-4">
          <div className="w-12 h-1 bg-[rgba(255,255,255,0.3)] rounded-full mx-auto mb-4" />
          {title && <h3 className="text-lg font-bold text-white">{title}</h3>}
        </div>
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
          {children}
        </div>
      </div>
    </div>
  );
}

// Floating action button
export function FAB({ icon: Icon, onClick, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-[#E41E65] to-[#C13666] shadow-lg flex items-center justify-center active:scale-90 transition-transform magenta-glow ${className}`}
    >
      <Icon className="w-6 h-6 text-white" strokeWidth={2} />
    </button>
  );
}