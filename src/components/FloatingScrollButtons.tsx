import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingScrollButtons() {
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      // Hiện nút lên top nếu cuộn qua 400px
      setShowTop(window.scrollY > 400);

      // Hiện nút xuống đáy nếu chưa tới gần đáy (cách đáy 400px)
      const isNearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 400;
      setShowBottom(!isNearBottom);
    };

    window.addEventListener('scroll', handleScroll);
    // Khởi tạo trạng thái ban đầu
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const smoothScrollTo = (targetY: number, duration: number = 600) => {
    const startY = window.scrollY;
    const difference = targetY - startY;
    let startTime: number | null = null;

    const easeInOutCubic = (t: number) => {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeInOutCubic(progress);
      
      window.scrollTo(0, startY + difference * easedProgress);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };

    window.requestAnimationFrame(step);
  };

  const scrollToTop = () => {
    smoothScrollTo(0, 600);
  };

  const scrollToNextSection = () => {
    const sections = Array.from(document.querySelectorAll('section, main > div, footer'))
      .filter((el) => {
        // Bỏ qua các hình trang trí decoration-blob
        if (el.classList.contains('decoration-blob')) return false;
        
        // Bỏ qua các phần tử ẩn hoặc absolute/fixed định vị ngoài luồng cuộn thông thường
        const style = window.getComputedStyle(el);
        if (style.position === 'absolute' || style.position === 'fixed') return false;
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        
        return true;
      });
    
    // Tìm section tiếp theo nằm bên dưới vị trí cuộn hiện tại
    // Phải dùng rect.top > 80 vì khi cuộn ta trừ đi 70px
    const nextSection = sections.find((section) => {
      const rect = section.getBoundingClientRect();
      return rect.top > 80; 
    });

    if (nextSection) {
      const rect = nextSection.getBoundingClientRect();
      const top = rect.top + window.scrollY - 70; // Trừ đi 70px chiều cao của navbar
      smoothScrollTo(top, 600);
    } else {
      smoothScrollTo(document.documentElement.scrollHeight, 600);
    }
  };

  return (
    <div className="fixed bottom-24 lg:bottom-6 left-4 lg:left-6 z-40 flex flex-col gap-3">
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            onClick={scrollToTop}
            className="w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all backdrop-blur-md group"
            aria-label="Lên đầu trang"
          >
            <span className="material-symbols-outlined text-2xl font-black text-indigo-600 dark:text-indigo-400 group-hover:-translate-y-1 transition-transform">arrow_upward</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBottom && (
          <motion.button
            initial={{ opacity: 0, x: -20, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.8 }}
            onClick={scrollToNextSection}
            className="w-12 h-12 flex items-center justify-center bg-white/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200/50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-110 active:scale-95 transition-all backdrop-blur-md group"
            aria-label="Cuộn xuống dưới"
          >
            <span className="material-symbols-outlined text-2xl font-black text-indigo-600 dark:text-indigo-400 group-hover:translate-y-1 transition-transform">arrow_downward</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
