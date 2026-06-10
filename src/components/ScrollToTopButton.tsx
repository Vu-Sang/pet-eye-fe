import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={scrollToTop}
          className="fixed bottom-40 lg:bottom-24 right-5 lg:right-5 z-40 w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all backdrop-blur-md"
          aria-label="Lên đầu trang"
        >
          <span className="material-symbols-outlined text-2xl font-black text-indigo-600 dark:text-indigo-400">arrow_upward</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
