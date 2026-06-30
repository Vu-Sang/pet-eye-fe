import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { shopService } from '../../services/shop.service';
import {
  Search, MapPin, Video, Star, ArrowRight, ShieldCheck, Shield, Heart, Sparkles,
  Zap, ChevronRight, Navigation, Clock, CheckCircle2, ChevronDown, Percent, Loader2, Compass, PawPrint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { trackHeroSearch, trackClickFeaturedShop, trackUseGpsNearby, trackClickCta } from '../../lib/analytics';

// Import assets
import heroDogImage from '../../assets/landing/hero_dog_v2.png';
import heroCatImage from '../../assets/landing/hero_cat_v2.png';
import mobileHeroBanner from '../../assets/landing/mobile_hero_banner.png';
import cameraPreview from '../../assets/landing/live_camera_preview_1778855116615.png';
import spaImage from '../../assets/landing/pet_spa_grooming_1778855139420.png';
import mockMapBg from '../../assets/landing/mock_map_bg.png';
import mockMapBgDark from '../../assets/landing/mock_map_bg_dark.png';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  // GPS State
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [nearbyCoords, setNearbyCoords] = useState<{ lat: number, lng: number } | null>(null);
  const [manualAddress, setManualAddress] = useState('');

  // Hero Search State
  const [heroCity, setHeroCity] = useState('');
  const [heroType, setHeroType] = useState('Tất cả');

  // Custom Dropdown for Search Bar
  const [isOpenType, setIsOpenType] = useState(false);
  const typeDropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
        setIsOpenType(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 1. Fetch Featured Shops (API)
  const { data: featuredShops = [], isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['featuredShops'],
    queryFn: () => shopService.searchPublic(),
  });

  // 2. Fetch Nearby Shops (API)
  const { data: nearbyShops = [], isLoading: isLoadingNearby } = useQuery({
    queryKey: ['nearbyShops', nearbyCoords],
    queryFn: () => shopService.searchNearby(nearbyCoords!.lat, nearbyCoords!.lng, 10),
    enabled: !!nearbyCoords,
  });

  const topFeaturedShops = featuredShops.slice(0, 4);

  const handleAction = (target: string) => {
    if (target.startsWith('/search')) {
      trackHeroSearch(heroCity, heroType);
      const params = new URLSearchParams(target.split('?')[1] || '');
      if (heroCity.trim() && !params.has('city')) params.set('city', heroCity.trim());
      if (heroType !== 'Tất cả' && !params.has('type')) params.set('type', heroType);
      navigate(`/search?${params.toString()}`);
      return;
    }

    const publicPaths = ['/search', '/camera'];
    if (publicPaths.includes(target) || user) {
      navigate(target);
    } else {
      navigate('/login');
    }
  };

  const handleGetLocation = () => {
    setLocationStatus('loading');
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          trackUseGpsNearby('success');
          setNearbyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStatus('success');
        },
        (err) => {
          trackUseGpsNearby('error');
          console.error(err);
          setLocationStatus('error');
          if (err.code === 3) {
            alert("Quá thời gian kết nối GPS. Vui lòng đảm bảo thiết bị của bạn đang bật dịch vụ định vị và thử lại.");
          } else {
            alert("Không thể lấy vị trí của bạn. Vui lòng cấp quyền truy cập vị trí trên trình duyệt.");
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    } else {
      setLocationStatus('error');
      alert("Trình duyệt của bạn không hỗ trợ tính năng định vị.");
    }
  };

  // FAQ State
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <main className="flex-1 overflow-x-hidden font-display relative pb-16 bg-slate-50 dark:bg-slate-950">
      {/* Background decoration from hero section applied to entire page */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-mesh opacity-10 dark:opacity-20" />

        <div className="absolute top-[5%] -left-[10%] w-[50%] h-[40%] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[10%] -right-[10%] w-[60%] h-[50%] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] pointer-events-none" />

        <div className="pattern-dots absolute inset-0 opacity-20 pointer-events-none" />
      </div>

      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="relative min-h-fit md:min-h-[80vh] xl:min-h-[85vh] flex items-center justify-center pt-32 pb-6 md:pt-32 md:pb-8 xl:pt-40 xl:pb-12 px-4 sm:px-6 overflow-hidden bg-transparent">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          {/* Falling Paw Prints (Optimized with hardware acceleration) */}
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={`paw-${i}`}
              initial={{ y: "-10vh", x: `${Math.random() * 100}%`, opacity: 0, rotate: 0 }}
              animate={{
                y: "110vh",
                x: `${Math.random() * 100}%`,
                opacity: [0, 0.15, 0.15, 0],
                rotate: 360
              }}
              transition={{
                duration: 18 + Math.random() * 15,
                repeat: Infinity,
                delay: Math.random() * 10,
                ease: "linear"
              }}
              style={{ willChange: "transform, opacity" }}
              className="absolute text-blue-900/10 dark:text-blue-200/5 z-0 pointer-events-none"
            >
              <PawPrint size={40 + Math.random() * 50} />
            </motion.div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12 items-start">
            <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col w-full gap-3 md:gap-6 lg:gap-8 text-center lg:text-left">
              <motion.div variants={fadeIn} className="hidden sm:inline-flex items-center gap-2 bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 px-3 py-1.5 md:px-4 md:py-2 rounded-full w-fit mx-auto lg:mx-0 shadow-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary dark:bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary dark:bg-cyan-400"></span>
                </span>
                <span className="text-[11px] md:text-[13px] font-black uppercase tracking-widest text-primary dark:text-blue-400">
                  NỀN TẢNG CHĂM SÓC THÚ CƯNG MINH BẠCH
                </span>
              </motion.div>

              <motion.h1 variants={fadeIn} className="text-2xl sm:text-4xl lg:text-6xl xl:text-7xl font-black leading-tight tracking-tight text-slate-900 dark:text-white">
                Chăm sóc <br className="hidden sm:block" />
                <span className="text-gradient">Thú cưng</span> <br className="hidden sm:block" />
                thời đại số.
              </motion.h1>

              <motion.p variants={fadeIn} className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Tìm kiếm dịch vụ thú cưng đáng tin cậy, đặt lịch nhanh chóng và theo dõi bé yêu mọi lúc qua Live Camera 24/7.
              </motion.p>

              {/* Glassmorphic Search Bar */}
              <motion.div variants={fadeIn} className="relative z-30 w-full glass dark:bg-slate-900/80 dark:border-slate-800 p-2 md:p-2 rounded-[32px] md:rounded-full mt-4 shadow-2xl dark:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group focus-within:ring-4 ring-primary/10 transition-all">
                <div className="flex flex-col md:grid md:grid-cols-12 gap-1.5 md:gap-2">
                  <div className="md:col-span-5 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 dark:text-blue-400 w-5 h-5" />
                    <input
                      value={heroCity}
                      onChange={e => setHeroCity(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAction('/search')}
                      className="w-full pl-12 pr-4 py-3 xl:py-4 bg-white/50 dark:bg-slate-950/50 text-slate-900 dark:text-white border-none rounded-full focus:ring-0 text-sm font-bold placeholder:text-slate-400"
                      placeholder="Tìm khu vực..."
                    />
                  </div>
                  <div className="md:col-span-4 relative border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-1.5 pb-1 md:py-0" ref={typeDropdownRef}>
                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary dark:text-cyan-400 w-5 h-5 pointer-events-none" />
                    
                    <button
                      type="button"
                      onClick={() => setIsOpenType(!isOpenType)}
                      className="w-full pl-12 pr-10 py-3 xl:py-4 bg-transparent border-none text-sm font-bold text-slate-900 dark:text-white flex items-center justify-between text-left focus:outline-none focus:ring-0"
                    >
                      <span>
                        {heroType === 'Tất cả' ? 'Tất cả dịch vụ' :
                         heroType === 'CLINIC' ? 'Khám thú y (Clinic)' :
                         heroType === 'SPA' ? 'Spa & Grooming' :
                         heroType === 'HOTEL' ? 'Lưu trú (Hotel)' :
                         'Dịch vụ tổng hợp'}
                      </span>
                      <ChevronDown className={`text-slate-400 w-4 h-4 transition-transform duration-200 ${isOpenType ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isOpenType && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute z-50 w-full md:w-[260px] left-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xl overflow-hidden py-1.5"
                        >
                          {[
                            { value: 'Tất cả', label: 'Tất cả dịch vụ' },
                            { value: 'CLINIC', label: 'Khám thú y (Clinic)' },
                            { value: 'SPA', label: 'Spa & Grooming' },
                            { value: 'HOTEL', label: 'Lưu trú (Hotel)' },
                            { value: 'MIXED', label: 'Dịch vụ tổng hợp' }
                          ].map((item) => {
                            const isSelected = heroType === item.value;
                            return (
                              <button
                                key={item.value}
                                type="button"
                                onClick={() => {
                                  setHeroType(item.value);
                                  setIsOpenType(false);
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm font-medium flex items-center justify-between transition-colors ${
                                  isSelected
                                    ? 'bg-primary/5 dark:bg-blue-500/10 text-primary dark:text-blue-400'
                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350'
                                }`}
                              >
                                <span>{item.label}</span>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-sm font-bold text-primary dark:text-blue-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                                    check_circle
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="md:col-span-3">
                    <button
                      onClick={() => handleAction('/search')}
                      className="w-full h-full bg-primary hover:bg-primary/95 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-full font-black transition-all flex items-center justify-center gap-2 py-3.5 md:py-4 shadow-lg shadow-primary/20 dark:shadow-blue-500/20 group-hover:scale-[1.02] text-sm"
                    >
                      <Search size={18} /> TÌM CƠ SỞ
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Mobile Only: Single Hero Image with Gradient (Modern App Style) */}
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }} className="relative lg:hidden w-full h-[220px] sm:h-[280px] mt-4 mb-2 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg">
                <img src={mobileHeroBanner} alt="Pet care" className="w-full h-full object-cover object-center" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
              </motion.div>
            </motion.div>

            <div className="relative hidden lg:block h-[500px] xl:h-[600px] w-full mt-8 xl:mt-0">
              {/* Dog Image (Background, Left-aligned) */}
              <motion.div
                initial={{ opacity: 0, x: 50, y: -20, rotate: -5 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: -3 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="absolute top-0 left-0 w-[65%] h-[80%] z-10 rounded-[40px] xl:rounded-[50px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] bg-white dark:bg-slate-800"
              >
                <img src={heroDogImage} alt="Dog patient" className="w-full h-full object-cover rounded-[40px] xl:rounded-[50px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-[40px] xl:rounded-[50px]" />
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                      <Heart size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Live Camera 24/7
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">Theo dõi bé mọi lúc</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Cat Image (Foreground, Right-aligned overlapping) */}
              <motion.div
                initial={{ opacity: 0, x: -50, y: 50, rotate: 5 }}
                animate={{ opacity: 1, x: 0, y: 0, rotate: 3 }}
                transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
                className="absolute bottom-0 right-0 w-[55%] h-[70%] z-20 rounded-[40px] xl:rounded-[50px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.4)] bg-white dark:bg-slate-800"
              >
                <img src={heroCatImage} alt="Cat spa" className="w-full h-full object-cover rounded-[40px] xl:rounded-[50px]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-[40px] xl:rounded-[50px]" />
                <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-6 left-6 right-6 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-3xl shadow-xl border border-white/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-500/30">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Đối tác xác thực</p>
                      <p className="text-[10px] text-slate-500 font-bold">Thông tin minh bạch</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>

              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-yellow-400 rounded-full blur-[80px] opacity-30 animate-pulse z-0" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full blur-[70px] opacity-20 animate-pulse z-0" style={{ animationDelay: '1s' }} />
            </div>
          </div>
        </div>

        {/* Animated Scroll Indicator - Pet Theme */}
        {/* <div
          onClick={() => document.getElementById('co-so')?.scrollIntoView({ behavior: 'smooth' })}
          className="absolute bottom-6 lg:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20 opacity-80 hover:opacity-100 transition-opacity cursor-pointer group"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="w-12 h-12 rounded-full bg-white dark:bg-white/10 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_0_20px_rgba(255,255,255,0.05)] border border-slate-100 dark:border-white/20 flex items-center justify-center text-primary dark:text-blue-400 group-hover:bg-primary dark:group-hover:bg-blue-500 group-hover:border-primary dark:group-hover:border-blue-500 group-hover:text-white dark:group-hover:text-white group-hover:scale-110 transition-all duration-300"
          >
            <PawPrint size={20} className="rotate-180" />
          </motion.div>
        </div> */}
      </section>

      {/* ─── Featured Services Showcase (API) ──────────────────────────── */}
      <section id="co-so" className="py-5 md:py-16 xl:py-24 px-4 sm:px-6 bg-transparent relative ">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-8 mb-8 md:mb-12 lg:mb-16">
            <div className="max-w-2xl space-y-1 md:space-y-4">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider w-fit">
                <Star size={12} className="fill-emerald-500 text-emerald-500 dark:fill-emerald-400 dark:text-emerald-400" />
                Đánh giá cao nhất
              </span>
              <h2 className="text-2xl sm:text-3xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-tight">
                Khám phá cơ sở <br className="hidden sm:block" />
                <span className="text-gradient">Được yêu thích</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base md:text-lg font-medium max-w-xl">
                Những phòng khám, spa và khách sạn thú cưng hàng đầu được cộng đồng PetEye tin tưởng và đánh giá cao nhất.
              </p>
            </div>
            <button onClick={() => navigate('/search')} className="flex items-center gap-2 font-black text-sm text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 transition-colors group">
              Xem tất cả cơ sở <ChevronRight className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {isLoadingFeatured ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary w-10 h-10" /></div>
          ) : (
            <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] after:content-[''] after:w-1 after:shrink-0 md:after:hidden">
              {topFeaturedShops.map((shop: any, index: number) => (
                <motion.div
                  key={shop.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                  onClick={() => {
                    trackClickFeaturedShop(shop.id, shop.shopName, index + 1);
                    navigate(`/clinic/${shop.id}`);
                  }}
                  className="w-[68vw] sm:w-[280px] md:w-auto shrink-0 snap-start bg-white dark:bg-slate-900/60 rounded-2xl md:rounded-[32px] overflow-hidden shadow-md hover:shadow-xl border border-slate-200/85 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 md:hover:-translate-y-2 transition-all cursor-pointer group flex flex-col"
                >
                  <div className="h-28 md:h-48 bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                    {shop.logoUrl ? (
                      <img src={shop.logoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={shop.shopName} />
                    ) : (
                      <img src={spaImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Placeholder" />
                    )}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="bg-white/95 dark:bg-slate-950/80 backdrop-blur text-primary dark:text-blue-400 border border-slate-100 dark:border-slate-800 shadow-sm px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{shop.shopType}</span>
                    </div>
                    {shop.ratingAvg > 0 && (
                      <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-lg">
                        <Star size={12} className="fill-current" /> {shop.ratingAvg.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="p-3.5 md:p-6 flex-1 flex flex-col">
                    <h3 className="text-base md:text-xl font-black text-slate-900 dark:text-white leading-tight mb-1.5 line-clamp-2">{shop.shopName}</h3>
                    <div className="flex items-start gap-1.5 text-slate-500 mb-3">
                      <MapPin size={14} className="shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs md:text-sm text-slate-550 dark:text-slate-400 font-medium line-clamp-2">{shop.address}, {shop.city}</span>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-4 border-t border-slate-200 dark:border-slate-700">
                      {shop.serviceNames?.slice(0, 3).map((svc: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 border border-slate-200/10 dark:border-slate-700/50 text-[10px] rounded-lg font-bold">{svc}</span>
                      ))}
                      {shop.serviceNames?.length > 3 && <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-750 dark:text-slate-350 border border-slate-200/10 dark:border-slate-700/50 text-[10px] rounded-lg font-bold">+{shop.serviceNames.length - 3}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </section>

      {/* ─── Nearby Shops (Hybrid GPS) ─────────────────────────────────── */}
      <section className="bg-transparent relative overflow-hidden">
        {/* Full Right Background Map */}
        <div className="absolute top-0 right-0 w-full lg:w-[75%] h-full pointer-events-none [mask-image:linear-gradient(to_right,transparent,black_20%,black_100%),linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]">
          {/* Actual Map Background */}
          <img
            src={isDark ? mockMapBgDark : mockMapBg}
            alt="Map Background"
            className="absolute inset-0 w-full h-full object-cover opacity-60 dark:opacity-90 mix-blend-multiply dark:mix-blend-normal grayscale-[20%] dark:grayscale-0"
          />


          <div className="hidden lg:block">
            {/* Radar Sweeps */}
            <div className="absolute top-[20%] left-[85%] md:top-1/2 md:left-[65%] -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-blue-500/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-[20%] left-[85%] md:top-1/2 md:left-[65%] -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-blue-500/30 rounded-full" />
            <div className="absolute top-[20%] left-[85%] md:top-1/2 md:left-[65%] -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-blue-500/10 rounded-full" />

            {/* Center User Pin */}
            <div className="absolute top-[20%] left-[85%] md:top-1/2 md:left-[65%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.6)] border-4 border-white dark:border-blue-900/50">
                <Navigation size={20} className="fill-current -rotate-45 md:w-6 md:h-6" />
              </div>
              <div className="mt-2 px-3 py-1 md:px-4 md:py-1.5 bg-white dark:bg-slate-800 rounded-full shadow-lg text-[9px] md:text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-wider border border-transparent dark:border-slate-700">Bạn ở đây</div>
            </div>
          </div>

          {/* Mock Pins */}
          <div className="hidden md:block">
            {[
              { t: "25%", l: "45%", delay: 0.5, dist: "1.2" },
              { t: "75%", l: "50%", delay: 1.2, dist: "3.5" },
              { t: "30%", l: "85%", delay: 0.8, dist: "2.1" },
              { t: "60%", l: "80%", delay: 1.5, dist: "4.0" },
              { t: "80%", l: "65%", delay: 2.1, dist: "2.8" },
            ].map((pin, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.5, delay: pin.delay, repeat: Infinity, repeatType: "reverse", repeatDelay: 4 }}
                className="absolute flex flex-col items-center z-10"
                style={{ top: pin.t, left: pin.l }}
              >
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-primary/20 dark:bg-blue-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-primary dark:text-blue-400 shadow-xl border-2 border-primary dark:border-blue-500/50">
                    <PawPrint size={18} className="fill-primary/20 dark:fill-blue-500/20" />
                  </div>
                </div>
                <div className="mt-2 px-3 py-1 bg-white/90 dark:bg-slate-800/90 backdrop-blur rounded-full shadow-sm text-[9px] font-black text-slate-500 dark:text-slate-300 border border-transparent dark:border-slate-700/50">
                  {pin.dist} km
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative min-h-fit lg:min-h-[700px] flex flex-col justify-center py-10 lg:py-24 px-6 z-10 max-w-7xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row items-center gap-12 w-full">
            <div className="lg:w-1/2 relative z-20">
              <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 md:p-0 md:bg-transparent md:dark:bg-transparent md:backdrop-blur-none rounded-2xl md:rounded-none border border-white/50 dark:border-slate-700/50 md:border-transparent shadow-xl md:shadow-none">
                <div className="mb-8">
                  <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider w-fit mb-6">
                    <Navigation size={12} className="text-rose-500 dark:text-rose-400" />
                    Hệ thống định vị
                  </div>
                  <h2 className="text-2xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-[1.1]">
                    Tìm cơ sở <br className="hidden lg:block" />
                    <span className="text-gradient">Gần bạn nhất</span>
                  </h2>
                  <p className="mt-4 md:mt-6 text-slate-600 dark:text-slate-300 text-sm md:text-lg max-w-lg mx-auto lg:mx-0 leading-relaxed font-medium">
                    Cho phép truy cập vị trí để tìm ngay các phòng khám, spa uy tín nằm trong bán kính 10km quanh bạn.
                  </p>
                </div>

                {!nearbyCoords && (
                  <div className="flex flex-col items-center lg:items-start">
                    <button
                      onClick={handleGetLocation}
                      disabled={locationStatus === 'loading'}
                      className="w-full sm:w-auto px-6 py-4 md:px-8 md:py-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-500 rounded-2xl md:rounded-[24px] font-black flex items-center justify-center gap-3 transition-all shadow-xl hover:shadow-blue-500/20 hover:-translate-y-1 group text-sm md:text-base"
                    >
                      {locationStatus === 'loading' ? (
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                          <Compass size={20} className={locationStatus === 'success' ? 'text-green-500' : 'text-blue-500'} />
                        </div>
                      )}
                      TÌM QUANH ĐÂY BẰNG GPS
                    </button>
                    <p className="text-xs text-slate-500 dark:text-white mt-4 italic flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">info</span>
                      Hệ thống sẽ tự động quét bản đồ
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="hidden lg:block"></div>
          </div>

          {/* Results Area (Now placed inside the map overlay area so it shares the background) */}
          <AnimatePresence>
            {nearbyCoords && (
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full mt-12 relative z-20"
              >
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <MapPin className="text-primary w-6 h-6" /> Kết quả quanh bạn:
                </h3>
                {isLoadingNearby ? (
                  <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>
                ) : (() => {
                  const sortedShops = [...nearbyShops].sort((a: any, b: any) => (a.distanceKm || 0) - (b.distanceKm || 0));
                  const displayedShops = sortedShops.slice(0, 4);

                  if (sortedShops.length === 0) {
                    return (
                      <div className="text-center text-slate-500 py-12 bg-white/60 backdrop-blur-md dark:bg-slate-900/60 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 shadow-sm">
                        Không tìm thấy cơ sở nào trong bán kính 10km.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-8">
                      <div className="flex overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] after:content-[''] after:w-1 after:shrink-0 md:after:hidden">
                        {displayedShops.map((shop: any) => (
                          <div key={shop.id} onClick={() => navigate(`/clinic/${shop.id}`)} className="w-[75vw] sm:w-[300px] md:w-auto shrink-0 snap-start bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-2xl md:rounded-[28px] overflow-hidden shadow-xl border border-slate-100 dark:border-slate-800 md:hover:-translate-y-2 transition-all cursor-pointer group flex flex-col">
                            <div className="h-36 md:h-40 bg-slate-200 dark:bg-slate-800 relative overflow-hidden shrink-0">
                              {shop.logoUrl ? <img src={shop.logoUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={shop.shopName} /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><MapPin size={32} /></div>}
                              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-slate-900 px-3 py-1 rounded-full text-xs font-black shadow-sm">
                                {shop.distanceKm?.toFixed(1)} km
                              </div>
                            </div>
                            <div className="p-4 md:p-5 flex-1 flex flex-col">
                              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{shop.shopType}</p>
                              <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">{shop.shopName}</h4>
                              <p className="text-sm text-slate-500 mt-2 line-clamp-2">{shop.address}, {shop.city}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {sortedShops.length > 4 && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={() => navigate(`/search?lat=${nearbyCoords.lat}&lng=${nearbyCoords.lng}&radius=10`)}
                            className="px-8 py-4 bg-white dark:bg-slate-900 border-2 border-primary/20 text-primary hover:bg-primary hover:text-white rounded-[20px] font-black text-sm uppercase tracking-wider flex items-center gap-3 transition-all shadow-lg shadow-primary/10 hover:shadow-primary/30 hover:-translate-y-1"
                          >
                            XEM TẤT CẢ {sortedShops.length} CƠ SỞ <ArrowRight size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>



      {/* ─── Live Camera Showcase ──────────────────────────────────────── */}
      <section id="camera" className="pt-10 pb-10 md:pt-24 md:pb-16 xl:pt-28 xl:pb-16 px-4 sm:px-6 bg-transparent relative overflow-hidden z-20">
        {/* <div className="absolute top-0 right-0 w-[50%] h-full bg-primary/10 blur-[150px] -rotate-12 pointer-events-none" /> */}
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 2xl:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-4 md:space-y-8 2xl:space-y-10">
              <div className="space-y-1 md:space-y-4 2xl:space-y-6">
                <span className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-300/60 dark:border-amber-500/25 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-black uppercase tracking-wider shadow-sm shadow-amber-200/40 dark:shadow-amber-500/10">
                  <Sparkles size={14} className="text-amber-500 dark:text-amber-400" /> Tính năng độc quyền
                </span>
                <h2 className="text-xl sm:text-3xl md:text-5xl 2xl:text-6xl font-black text-blue-950 dark:text-white leading-tight">
                  An tâm tuyệt đối với <span className="text-gradient">Live Camera</span>
                </h2>
                <p className="text-sm sm:text-base md:text-lg 2xl:text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">Theo dõi trực tiếp mọi khoảnh khắc của bé yêu 24/7 từ điện thoại. Bạn sẽ luôn cảm thấy gần gũi dù đang ở bất cứ đâu.</p>
              </div>
              <div className="space-y-4 2xl:space-y-6">
                {[
                  { t: "Chất lượng HD 4K", d: "Hình ảnh sắc nét, mượt mà cả ngày lẫn đêm.", icon: <Sparkles className="text-amber-400" /> },
                  { t: "Đàm thoại 2 chiều", d: "Trò chuyện từ xa dễ dàng.", icon: <Video className="text-secondary" /> },
                  { t: "Bảo mật nâng cao", d: "Mã hóa đầu cuối, đảm bảo chỉ bạn mới có quyền xem.", icon: <ShieldCheck className="text-green-500" /> }
                ].map((item, i) => (
                  <motion.div key={i} className="flex gap-4 2xl:gap-6 items-start group p-2 2xl:p-4 rounded-3xl border border-transparent hover:border-slate-200/60 dark:hover:border-slate-800/60 hover:bg-white dark:hover:bg-slate-900/60 hover:shadow-lg dark:hover:shadow-none transition-all duration-300">
                    <div className="w-10 h-10 2xl:w-14 2xl:h-14 rounded-xl 2xl:rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700/60 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 dark:text-white text-base 2xl:text-lg">{item.t}</h4>
                      <p className="text-slate-500 dark:text-slate-400 font-medium text-xs 2xl:text-sm mt-1">{item.d}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button onClick={() => handleAction('/search?type=HOTEL')} className="w-full sm:w-fit justify-center bg-primary hover:bg-primary/95 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-6 py-4 md:py-3 2xl:px-10 2xl:py-5 rounded-2xl 2xl:rounded-[24px] font-black flex items-center gap-2 2xl:gap-3 transition-all shadow-lg shadow-primary/20 dark:shadow-blue-500/20 hover:scale-[1.02] text-sm 2xl:text-base">
                KHÁM PHÁ CƠ SỞ CÓ CAMERA <ArrowRight size={20} className="w-4 h-4 2xl:w-5 2xl:h-5" />
              </button>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="relative">
              <div className="relative z-10 p-2 md:p-4 glass dark:bg-slate-900/80 dark:border-slate-800 rounded-2xl md:rounded-[50px] shadow-3xl">
                <div className="relative aspect-[4/3] rounded-xl md:rounded-[40px] overflow-hidden bg-slate-950">
                  {/* Lớp phủ giả lập viền tối của Camera */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 shadow-[inset_0_0_50px_rgba(0,0,0,0.4)]"></div>
                  
                  {/* Video Live Stream thực tế */}
                  <video 
                    src="/video/video.mp4" 
                    poster={cameraPreview}
                    autoPlay 
                    loop 
                    muted 
                    playsInline 
                    className="w-full h-full object-cover object-center opacity-90 pointer-events-none grayscale-[30%] contrast-125 sepia-[.15]" 
                  />
                  
                  {/* Hiển thị Ngày/Giờ CCTV */}
                  <div className="absolute top-6 right-6 font-mono text-white/95 text-sm md:text-base font-black tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-20 hidden sm:block">
                    2025-07-22 09:42:27
                  </div>

                  {/* Hiển thị Tên Camera CCTV */}
                  <div className="absolute bottom-6 left-6 font-mono text-white/95 text-base md:text-2xl font-black tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] z-20 hidden sm:flex items-center gap-3">
                    CAM01
                  </div>
                  
                  {/* Trạng thái LIVE góc trái */}
                  <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                    <div className="px-3 py-1.5 rounded-sm bg-black/40 backdrop-blur-md border border-white/10 text-[10px] font-black text-white flex items-center gap-2 tracking-widest uppercase">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
                    </div>
                  </div>

                  {/* Giữ lại Box thông tin mô phỏng PetEye để trang trí */}
                  <div className="absolute bottom-6 right-6 flex items-center gap-2 z-20">
                     <div className="bg-slate-950/70 backdrop-blur-md border border-white/10 p-3 rounded-2xl text-right">
                      <p className="text-xs font-black text-white">Mochi - Scottish Fold</p>
                      <p className="text-[10px] font-medium text-white/70">Đang được chăm sóc</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-[100px]" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── How it Works (Quy trình) ──────────────────────────────────── */}
      <section className="pt-10 pb-10 md:pt-16 md:pb-24 2xl:pt-20 2xl:pb-32 px-4 sm:px-6 bg-transparent relative overflow-hidden z-10">
        <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-6 md:mb-16 xl:mb-24 space-y-1 md:space-y-4">
            <span className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-500/20 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              <Zap size={14} className="text-indigo-500 dark:text-indigo-400" /> Đơn giản &amp; Nhanh chóng
            </span>
            <h2 className="text-xl sm:text-3xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white tracking-tight">Sử dụng PetEye <span className="text-gradient">Chỉ với 3 bước</span></h2>
          </div>

          <div className="relative max-w-6xl mx-auto mt-12 lg:mt-20">
            {/* Connecting Path Line (Desktop) */}
            <div className="hidden lg:block absolute top-[40%] left-[15%] w-[70%] border-t-[3px] border-dashed border-slate-300 dark:border-slate-700 z-0" />

            {/* Arrow Connectors */}
            <div className="hidden lg:flex absolute top-[40%] left-[calc(33.333%-8px)] -translate-y-1/2 -translate-x-1/2 z-20 items-center justify-center pointer-events-none text-blue-500">
              <motion.div animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="-mr-5">
                <ChevronRight size={40} strokeWidth={3} />
              </motion.div>
              <motion.div animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}>
                <ChevronRight size={40} strokeWidth={3} />
              </motion.div>
            </div>

            <div className="hidden lg:flex absolute top-[40%] left-[calc(66.666%+8px)] -translate-y-1/2 -translate-x-1/2 z-20 items-center justify-center pointer-events-none text-blue-500">
              <motion.div animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="-mr-5">
                <ChevronRight size={40} strokeWidth={3} />
              </motion.div>
              <motion.div animate={{ opacity: [0.2, 1, 0.2], x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}>
                <ChevronRight size={40} strokeWidth={3} />
              </motion.div>
            </div>

            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-12 sm:gap-16 lg:gap-12 relative z-10 items-center lg:items-stretch">
              {/* Step 1 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className="w-full max-w-sm lg:max-w-none group relative bg-transparent lg:bg-white lg:dark:bg-slate-900 border-none lg:border lg:border-slate-200 lg:dark:border-slate-800 p-0 lg:p-8 rounded-none lg:rounded-[40px] shadow-none lg:shadow-xl lg:hover:shadow-2xl lg:hover:shadow-blue-500/10 lg:hover:border-blue-500/50 transition-all duration-500 flex flex-col items-center text-center"
              >
                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 md:-top-8 md:-right-8 text-[100px] sm:text-[120px] md:text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6 hidden lg:block">1</div>

                <div className="relative z-10 flex flex-col h-full items-center w-full">
                  <div className="inline-flex items-center justify-center text-[#005FFF] bg-[#F7FBFF] border border-[#D7ECFF] dark:bg-blue-900/50 dark:text-blue-400 dark:border-blue-800 text-[10px] sm:text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6 w-fit uppercase tracking-widest order-1 lg:order-1">
                    Bước 1
                  </div>

                  {/* Mock UI */}
                  <div className="w-full h-36 sm:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-[40px] lg:rounded-3xl mb-6 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center gap-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors duration-500 shadow-inner lg:shadow-none order-3 lg:order-2">
                    <div className="w-3/4 lg:w-full h-8 sm:h-10 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center px-3 sm:px-4 gap-2 sm:gap-3 animate-pulse" style={{ animationDuration: '3s' }}>
                      <Search size={14} className="text-slate-400" />
                      <div className="h-1.5 sm:h-2 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 sm:h-8 px-3 sm:px-4 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center gap-1 sm:gap-2">
                        <MapPin size={10} className="text-blue-500" />
                        <div className="h-1 sm:h-1.5 w-6 sm:w-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="h-6 sm:h-8 px-3 sm:px-4 bg-white dark:bg-slate-800 rounded-full shadow-sm flex items-center gap-1 sm:gap-2">
                        <Star size={10} className="text-yellow-500" />
                        <div className="h-1 sm:h-1.5 w-4 sm:w-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                    </div>
                  </div>

                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 order-2 lg:order-3">Tìm & So sánh</h4>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto max-w-xs lg:max-w-none order-4 lg:order-4">Khám phá và so sánh ngay các cơ sở thú y quanh bạn với đầy đủ thông tin, đánh giá và khoảng cách chi tiết.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
                className="w-full max-w-sm lg:max-w-none group relative bg-transparent lg:bg-white lg:dark:bg-slate-900 border-none lg:border lg:border-slate-200 lg:dark:border-slate-800 p-0 lg:p-8 rounded-none lg:rounded-[40px] shadow-none lg:shadow-xl lg:hover:shadow-2xl lg:hover:shadow-purple-500/10 lg:hover:border-purple-500/50 transition-all duration-500 flex flex-col items-center text-center"
              >
                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 md:-top-8 md:-right-8 text-[100px] sm:text-[120px] md:text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6 hidden lg:block">2</div>

                <div className="relative z-10 flex flex-col h-full items-center w-full">
                  <div className="inline-flex items-center justify-center text-[#A800FF] bg-[#FDFAFF] border border-[#F5E8FF] dark:bg-purple-900/50 dark:text-purple-400 dark:border-purple-800 text-[10px] sm:text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6 w-fit uppercase tracking-widest order-1 lg:order-1">
                    Bước 2
                  </div>

                  <div className="w-full h-36 sm:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-[40px] lg:rounded-3xl mb-6 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center group-hover:bg-purple-50 dark:group-hover:bg-purple-900/10 transition-colors duration-500 shadow-inner lg:shadow-none order-3 lg:order-2">
                    <div className="grid grid-cols-3 gap-2 w-3/4 lg:w-full">
                      {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time, idx) => (
                        <div key={time} className={`h-7 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center text-[9px] sm:text-[10px] font-black tracking-wider transition-all duration-500 ${idx === 2 ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 scale-105' : 'bg-white dark:bg-slate-800 text-slate-450 dark:text-slate-400 shadow-sm'}`}>
                          {time}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 w-3/4 lg:w-full h-8 sm:h-10 bg-slate-900 dark:bg-slate-800 rounded-full lg:rounded-xl flex items-center justify-center gap-2">
                      <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)] animate-pulse" />
                      <div className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-widest">Xác nhận lịch</div>
                    </div>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 order-2 lg:order-3">Đặt lịch 24/7</h4>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto max-w-xs lg:max-w-none order-4 lg:order-4">Chọn khung giờ phù hợp và đặt lịch ngay lập tức. Hệ thống tự động xác nhận không cần chờ đợi.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
                className="w-full max-w-sm lg:max-w-none group relative bg-transparent lg:bg-white lg:dark:bg-slate-900 border-none lg:border lg:border-slate-200 lg:dark:border-slate-800 p-0 lg:p-8 rounded-none lg:rounded-[40px] shadow-none lg:shadow-xl lg:hover:shadow-2xl lg:hover:shadow-rose-500/10 lg:hover:border-rose-500/50 transition-all duration-500 flex flex-col items-center text-center"
              >
                <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 md:-top-8 md:-right-8 text-[100px] sm:text-[120px] md:text-[180px] font-black text-slate-50 dark:text-slate-800/30 leading-none select-none z-0 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-6 hidden lg:block">3</div>

                <div className="relative z-10 flex flex-col h-full items-center w-full">
                  <div className="inline-flex items-center justify-center text-[#FF0038] bg-[#FFF9FA] border border-[#FFE3E6] dark:bg-rose-900/50 dark:text-rose-400 dark:border-rose-800 text-[10px] sm:text-xs font-black px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-4 sm:mb-6 w-fit uppercase tracking-widest order-1 lg:order-1">
                    Bước 3
                  </div>

                  <div className="w-full h-36 sm:h-40 bg-slate-50 dark:bg-slate-950/50 rounded-[40px] lg:rounded-3xl mb-6 p-4 lg:p-5 border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center group-hover:bg-rose-50 dark:group-hover:bg-rose-900/10 transition-colors duration-500 shadow-inner lg:shadow-none order-3 lg:order-2">
                    <div className="flex gap-1.5 mb-3 sm:mb-4">
                      {[1, 2, 3, 4, 5].map((s, idx) => (
                        <Star key={s} size={20} className="sm:w-6 sm:h-6 fill-rose-400 text-rose-400 drop-shadow-sm transition-transform duration-300 hover:scale-125 hover:-rotate-12 cursor-pointer" style={{ animationDelay: `${idx * 100}ms` }} />
                      ))}
                    </div>
                    <div className="w-3/4 lg:w-full bg-white dark:bg-slate-850 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2 lg:mb-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-slate-200 dark:bg-slate-700 rounded-full" />
                        <div className="h-2 w-16 lg:w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full mx-auto mb-2" />
                      <div className="h-1.5 w-2/3 bg-slate-100 dark:bg-slate-700 rounded-full mx-auto" />
                    </div>
                  </div>
                  <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-3 order-2 lg:order-3">Trải nghiệm & Review</h4>
                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium mt-auto max-w-xs lg:max-w-none order-4 lg:order-4">Tận hưởng dịch vụ chăm sóc chuyên nghiệp tại cơ sở và để lại đánh giá nhằm giúp cộng đồng có thêm nhiều sự lựa chọn uy tín.</p>
                </div>
              </motion.div>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-12 lg:mt-16 flex justify-center"
            >
              <button
                onClick={() => navigate(user ? '/search' : '/login')}
                className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 lg:px-10 lg:py-5 font-black text-white bg-primary dark:bg-blue-600 rounded-full overflow-hidden shadow-2xl shadow-primary/30 dark:shadow-blue-500/20 hover:scale-105 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-indigo-600 dark:from-blue-600 dark:to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <span className="relative z-10 flex items-center gap-2 text-sm lg:text-base">
                  {user ? 'ĐẶT LỊCH NGAY' : 'ĐĂNG NHẬP & TRẢI NGHIỆM NGAY'} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </span>
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials (Horizontal Split) ───────────────────────────── */}
      <section className="pt-10 pb-10 md:pt-16 md:pb-24 2xl:pt-20 2xl:pb-32 bg-transparent overflow-hidden relative z-10">

        {/* Background Gradients */}
        {/* <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-[150px] pointer-events-none" /> */}

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">

            {/* Left Column (Text & Stats) */}
            <div className="lg:col-span-5 space-y-8 flex flex-col items-center text-center lg:items-start lg:text-left">
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-black text-xs uppercase tracking-widest mb-6">
                  <Star size={14} className="text-blue-600 dark:text-blue-400" /> Đánh giá nổi bật
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-5xl xl:text-6xl font-black text-blue-950 dark:text-white leading-[1.1] mb-2">
                  Phản hồi từ <br className="hidden lg:block" />
                  người dùng <br className="hidden lg:block" />
                  <span className="text-gradient text-3xl sm:text-4xl md:text-6xl xl:text-7xl mt-2 inline-block font-black">PetEye</span>
                </h2>
                <p className="hidden lg:block text-slate-600 dark:text-slate-400 text-lg md:text-xl font-medium mt-6 leading-relaxed max-w-sm">
                  Kết nối yêu thương, chăm sóc tận tâm. Khám phá lý do hàng ngàn khách hàng luôn tin tưởng và lựa chọn PetEye.
                </p>
              </div>

              <div className="flex items-center gap-4 justify-center lg:justify-start">
                <div className="flex -space-x-3">
                  <img src="https://i.pravatar.cc/150?img=1" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <img src="https://i.pravatar.cc/150?img=5" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <img src="https://i.pravatar.cc/150?img=11" className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 object-cover" alt="User" />
                  <div className="w-10 h-10 rounded-full border-2 border-white dark:border-slate-900 bg-primary text-white flex items-center justify-center text-xs font-bold">+</div>
                </div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span className="text-primary dark:text-blue-400 font-black text-base">1000+</span> Lượt đặt lịch thành công.
                </div>
              </div>
            </div>

            {/* Right Column (Horizontal Marquees) */}
            <div className="lg:col-span-7 relative flex flex-col gap-6 overflow-hidden py-4 -mx-6 px-6 lg:mx-0 lg:px-0">
              {/* Overlay Gradients to hide edges smoothly */}
              {/* <div className="absolute top-0 left-0 bottom-0 w-12 lg:w-24 bg-gradient-to-r from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" /> */}
              {/* <div className="absolute top-0 right-0 bottom-0 w-12 lg:w-24 bg-gradient-to-l from-slate-50 dark:from-slate-950 to-transparent z-10 pointer-events-none" /> */}

              {/* Row 1 - Scrolling Left */}
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 30, ease: "linear", repeat: Infinity }}
                className="flex gap-4 sm:gap-6 w-max"
              >
                {[1, 2].map((loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {/* Card 1 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-500 flex items-center justify-center"><Heart size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-rose-500 uppercase tracking-widest">Tin cậy 100%</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Từ ngày có PetEye, việc đặt lịch tắm cho bé cún dễ dàng hơn hẳn. Mình đặc biệt thích tính năng xem camera."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=1" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Thu Trang" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Thu Trang</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mẹ bé Corgi</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 2 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-500 flex items-center justify-center"><Navigation size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-blue-500 uppercase tracking-widest">Tiện Lợi</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Hệ thống lọc cơ sở rất thông minh. Mình tìm được một phòng khám ngay sát nhà có bác sĩ chuyên môn cao."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=11" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Minh Tuấn" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Minh Tuấn</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chủ bé Mèo Anh</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 3 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 flex items-center justify-center"><Shield size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-500 uppercase tracking-widest">An Tâm</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Trải nghiệm tuyệt vời! Cảm giác rất an tâm khi có thể mở app lên và xem bé đang làm gì. Các phòng khám nhiệt tình."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=9" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Hoàng Oanh" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Hoàng Oanh</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mẹ bé Husky</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </motion.div>

              {/* Row 2 - Scrolling Right */}
              <motion.div
                animate={{ x: ["-50%", "0%"] }}
                transition={{ duration: 35, ease: "linear", repeat: Infinity }}
                className="hidden lg:flex gap-6 w-max -ml-12"
              >
                {[1, 2].map((loopIdx) => (
                  <React.Fragment key={loopIdx}>
                    {/* Card 4 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-500 flex items-center justify-center"><Star size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-purple-500 uppercase tracking-widest">Chất lượng 5 sao</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Các đánh giá trên nền tảng rất chân thực. Voucher giảm giá cũng nhiều. Chắc chắn sẽ sử dụng PetEye lâu dài!"
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=5" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Ngọc Lan" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Ngọc Lan</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mẹ 2 bé Poodle</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 5 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-500 flex items-center justify-center"><CheckCircle2 size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest">Minh bạch</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Giá cả minh bạch, đặt lịch nhanh gọn. Không cần phải gọi điện thoại hỏi từng phòng khám xem có rảnh không nữa."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=12" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Quốc Hưng" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Quốc Hưng</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Chủ 3 bé Mèo</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>

                    {/* Card 6 */}
                    <div className="w-64 sm:w-72 shrink-0 bg-white dark:bg-slate-900/60 p-4 sm:p-6 rounded-[20px] shadow-md hover:shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/20 hover:dark:border-blue-500/30 transition-all duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-500 flex items-center justify-center"><Heart size={10} /></div>
                        <span className="text-[9px] sm:text-[10px] font-black text-pink-500 uppercase tracking-widest">Tuyệt Vời</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm font-medium mb-4 sm:mb-5 leading-relaxed line-clamp-3">
                        "Ứng dụng thiết kế rất thân thiện. Mình có thể dễ dàng quản lý sổ tiêm chủng của bé ngay trên điện thoại."
                      </p>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <img src="https://i.pravatar.cc/150?img=20" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover" alt="Thanh Thảo" />
                          <div>
                            <h4 className="font-black text-[10px] sm:text-xs text-slate-900 dark:text-white">Thanh Thảo</h4>
                            <p className="text-[8px] sm:text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Mẹ bé Samoyed</p>
                          </div>
                        </div>
                        <div className="flex text-yellow-400"><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /><Star size={10} className="fill-current" /></div>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </motion.div>
            </div>

          </div>
        </div>

      </section>

      {/* ─── FAQ Section ───────────────────────────────────────────────── */}
      <section className="pt-10 pb-10 md:pt-16 md:pb-24 2xl:pt-20 2xl:pb-32 px-6 bg-transparent relative">
        <div className="max-w-3xl mx-auto relative z-10">
          <div className="text-center mb-6 md:mb-8 xl:mb-16">
            <h2 className="text-2xl sm:text-3xl xl:text-4xl font-black text-slate-900 dark:text-white mb-4"><span className="text-gradient">Câu hỏi thường gặp</span></h2>
            <p className="text-slate-500">Mọi thắc mắc của bạn đều được giải đáp.</p>
          </div>
          <div className="space-y-3 md:space-y-4">
            {[
              { q: "Đặt lịch trên PetEye có mất phí không?", a: "Hoàn toàn miễn phí. Bạn chỉ thanh toán đúng số tiền dịch vụ cho cơ sở thú y mà không phải chịu thêm bất kỳ khoản phí nền tảng nào." },
              { q: "Làm sao để biết cơ sở trên PetEye đáng tin cậy?", a: "Các đối tác tham gia PetEye đều trải qua quy trình xác thực thông tin trước khi được hiển thị trên nền tảng. Người dùng có thể tham khảo hồ sơ cơ sở, hình ảnh thực tế, đánh giá từ khách hàng trước đó và các thông tin liên quan để đưa ra quyết định phù hợp. Ngoài ra, một số cơ sở còn cung cấp tính năng theo dõi camera trực tuyến giúp tăng tính minh bạch trong quá trình chăm sóc thú cưng." },
              { q: "Nếu thú cưng gặp sự cố trong thời gian sử dụng dịch vụ thì sao?", a: "PetEye không trực tiếp cung cấp dịch vụ chăm sóc thú cưng mà đóng vai trò là nền tảng kết nối. Trong trường hợp phát sinh sự cố, PetEye sẽ hỗ trợ tiếp nhận thông tin, phối hợp với đối tác liên quan và xem xét các bằng chứng như hình ảnh, video hoặc dữ liệu camera (nếu có) để hỗ trợ giải quyết khiếu nại một cách minh bạch và công bằng." },
              { q: "Tôi có thể hủy hoặc thay đổi lịch hẹn sau khi đặt không?", a: "Có. Bạn có thể hủy hoặc thay đổi lịch hẹn thông qua tài khoản PetEye trước thời gian sử dụng dịch vụ. Chính sách hoàn tiền và hủy lịch có thể khác nhau tùy theo từng cơ sở. Thông tin chi tiết sẽ được hiển thị trước khi bạn xác nhận đặt lịch để đảm bảo minh bạch ngay từ đầu." },
              { q: "Tôi có thể xem thú cưng của mình khi đang gửi lưu trú không?", a: "Có. Đối với các cơ sở tham gia chương trình Camera Monitoring của PetEye, chủ nuôi có thể truy cập camera trực tuyến trong thời gian thú cưng đang sử dụng dịch vụ. Quyền truy cập chỉ được cấp cho khách hàng có đơn đặt lịch hợp lệ nhằm đảm bảo tính riêng tư và an toàn thông tin." }
            ].map((faq, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full px-4 py-4 md:px-6 md:py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-black text-sm md:text-base text-slate-900 dark:text-white pr-4 leading-snug">{faq.q}</span>
                  <ChevronDown className={`shrink-0 text-slate-400 transition-transform ${activeFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {activeFaq === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-4 md:px-6 pb-4 md:pb-5 text-slate-500 dark:text-slate-350 text-sm md:text-base font-medium leading-relaxed">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── News & Community CTA ─────────────────────────────────────────── */}
      <section className="px-6 py-12 md:py-16 xl:py-20 bg-transparent relative z-10">
        {/* Lớp phủ chuyển màu mịn màng từ phần FAQ nền sáng sang phần News */}
        {/* <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-slate-50 to-transparent dark:from-slate-950 dark:to-transparent pointer-events-none z-10" /> */}
        <div className="max-w-5xl mx-auto relative">
          {/* Decorative Glowing Backdrop */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-blue-400/20 dark:bg-indigo-500/10 blur-[100px] rounded-full -z-10 pointer-events-none"></div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-b from-blue-50/80 to-blue-100/50 dark:from-slate-900 dark:to-blue-950/30 rounded-3xl md:rounded-[3rem] p-6 md:p-16 text-center border-2 border-blue-400 dark:border-blue-500/50 shadow-[0_20px_60px_-15px_rgba(59,130,246,0.3)] dark:shadow-[0_20px_60px_-15px_rgba(59,130,246,0.15)] relative overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest mb-6">
              <span className="material-symbols-outlined text-sm">article</span>
              Tin tức & Cộng đồng
            </div>

            <h2 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white mb-6 tracking-tight">
              Cập nhật tin tức <span className="text-blue-600 dark:text-blue-400">mới nhất</span>
            </h2>

            <p className="text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto mb-10 leading-relaxed text-sm md:text-base">
              Khám phá những kiến thức chăm sóc thú cưng bổ ích và các sự kiện hấp dẫn từ hệ sinh thái PetEye.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button onClick={() => window.open('https://web.facebook.com/profile.php?id=61590306674838', '_blank')} className="w-full sm:w-auto bg-[#1877F2] hover:bg-[#166FE5] text-white px-8 py-3.5 rounded-full font-black text-sm shadow-xl shadow-blue-500/10 hover:-translate-y-0.5 transition-all active:scale-95">
                Tham gia Facebook
              </button>
              <button onClick={() => window.open('https://tiktok.com', '_blank')} className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 px-8 py-3.5 rounded-full font-black text-sm shadow-lg shadow-slate-200/50 dark:shadow-none hover:-translate-y-0.5 transition-all active:scale-95">
                Theo dõi TikTok
              </button>
            </div>
          </motion.div>
        </div>
      </section>


    </main>
  );
}
