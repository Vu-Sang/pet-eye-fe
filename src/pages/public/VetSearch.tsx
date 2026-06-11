import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useClinics } from '../../hooks/useClinics';
import { ShopPublicResponse } from '../../services/shop.service';
import {
  Search, MapPin, Star, Filter, ArrowRight, Grid, List as ListIcon,
  Map as MapIcon, ChevronRight, SlidersHorizontal, CheckCircle2,
  X, Phone, Navigation, Info, Sparkles, Stethoscope, Scissors, Home, Store,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { NearbyShopResponse } from '../../services/clinic.service';
import ShopMap from '../../components/ShopMap';
import NearbyShops from '../../components/NearbyShops';

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const SHOP_TYPE_TABS = [
  { value: 'Tất cả', label: 'Tất cả', icon: <Grid size={16} /> },
  { value: 'CLINIC', label: 'Khám thú y', icon: <Stethoscope size={16} /> },
  { value: 'SPA', label: 'Spa & Grooming', icon: <Scissors size={16} /> },
  { value: 'HOTEL', label: 'Lưu trú', icon: <Home size={16} /> },
  { value: 'MIXED', label: 'Tổng hợp', icon: <Store size={16} /> },
];

const SORT_OPTIONS = ['Đánh giá cao nhất', 'Gần nhất', 'Mới nhất'];

const RATING_OPTIONS = [
  { value: 0, label: 'Tất cả' },
  { value: 3, label: '3★ trở lên' },
  { value: 4, label: '4★ trở lên' },
  { value: 4.5, label: '4.5★ trở lên' },
];



function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={12}
          className={`${s <= Math.floor(rating) ? 'text-amber-400 fill-amber-400' : s - rating <= 0.5 ? 'text-amber-300 fill-amber-300' : 'text-slate-300'}`}
        />
      ))}
    </span>
  );
}

export default function VetSearch() {
  const [searchParams] = useSearchParams();
  const radiusParam = searchParams.get('radius');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');

  const {
    clinics,
    isLoading,
    searchQuery,
    setSearchQuery,
    cityQuery,
    setCityQuery,
    activeService,
    setActiveService,
    minRating,
    setMinRating,
    page,
    setPage,
    totalPages,
    totalElements,
    selectedServices,
    setSelectedServices,
    availableServices,
  } = useClinics();

  const [sortBy, setSortBy] = useState(latParam ? 'Gần nhất' : 'Đánh giá cao nhất');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [distanceKm, setDistanceKm] = useState(radiusParam ? parseInt(radiusParam, 10) : 30);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(
    latParam && lngParam ? { lat: parseFloat(latParam), lng: parseFloat(lngParam) } : null
  );
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [showRadiusModal, setShowRadiusModal] = useState(!!radiusParam);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Count active filters for badge
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (minRating > 0) count++;
    if (distanceKm !== 30) count++;
    if (selectedServices.length > 0) count += selectedServices.length;
    return count;
  }, [minRating, distanceKm, selectedServices]);


  useEffect(() => {
    if (!latParam || !lngParam) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          (err) => console.warn('Geolocation error:', err)
        );
      }
    }
  }, [latParam, lngParam]);

  // Lock body scroll when mobile filter is open
  useEffect(() => {
    if (isMobileFilterOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isMobileFilterOpen]);

  const shopsWithDistance = useMemo(() => {
    return clinics.map((shop: ShopPublicResponse) => {
      let dist = undefined;
      if (userLocation && shop.latitude && shop.longitude) {
        dist = calculateDistance(userLocation.lat, userLocation.lng, shop.latitude, shop.longitude);
      }
      return { ...shop, distanceKm: dist };
    });
  }, [clinics, userLocation]);

  const sortedClinics = useMemo(() => {
    return [...shopsWithDistance].filter((shop: any) => {
      // Filter by distance if we have user location
      if (userLocation && shop.distanceKm !== undefined) {
        if (shop.distanceKm > distanceKm) return false;
      }
      

      return true;
    }).sort((a: any, b: any) => {
      if (sortBy === 'Gần nhất' && a.distanceKm !== undefined && b.distanceKm !== undefined) {
        return a.distanceKm - b.distanceKm;
      }
      if (sortBy === 'Đánh giá cao nhất') return b.ratingAvg - a.ratingAvg;
      return b.id - a.id;
    });
  }, [shopsWithDistance, userLocation, distanceKm, sortBy]);
  const springTransition = {
    type: "spring",
    stiffness: 100,
    damping: 15
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { ...springTransition }
  };

  const staggerContainer = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { ...springTransition } },
  };

  // All shops mapped for sidebar list (includes shops without coordinates)
  const allShopsForList: NearbyShopResponse[] = useMemo(() => {
    return sortedClinics.map((shop: any) => ({
      id: shop.id,
      shopName: shop.shopName,
      shopType: shop.shopType,
      address: shop.address,
      city: shop.city,
      latitude: shop.latitude || 0,
      longitude: shop.longitude || 0,
      logoUrl: shop.licenseImageUrl || '',
      ratingAvg: shop.ratingAvg,
      distanceKm: shop.distanceKm ?? 0,
      durationMinutes: null
    }));
  }, [sortedClinics]);

  // Only shops with valid coordinates for map markers
  const shopsForMap: NearbyShopResponse[] = useMemo(() => {
    return allShopsForList.filter(shop => shop.latitude !== 0 && shop.longitude !== 0);
  }, [allShopsForList]);

  // ── Filter Content (shared between sidebar and mobile bottom sheet) ──
  const filterContent = (
    <div className="space-y-8">
      {/* Rating filter */}
      <div className="space-y-4">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Đánh giá sao</p>
        <div className="space-y-2">
          {RATING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMinRating(opt.value)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border-2 ${minRating === opt.value
                  ? 'bg-primary/5 dark:bg-primary/20 border-primary text-primary'
                  : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
            >
              <span className="text-sm font-bold">{opt.label}</span>
              {opt.value > 0 && <StarRow rating={opt.value} />}
            </button>
          ))}
        </div>
      </div>

      {/* Services filter */}
      {availableServices.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Dịch vụ</p>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {availableServices.map((svc) => (
              <label key={svc} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group">
                <div className="relative flex items-center justify-center w-5 h-5 shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(svc)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedServices([...selectedServices, svc]);
                      } else {
                        setSelectedServices(selectedServices.filter(s => s !== svc));
                      }
                    }}
                    className="w-5 h-5 rounded-md border-2 border-slate-200 dark:border-slate-700 text-primary focus:ring-primary focus:ring-offset-0 bg-transparent transition-all checked:bg-primary checked:border-primary cursor-pointer appearance-none"
                  />
                  <CheckCircle2 size={12} className={`absolute text-white pointer-events-none transition-transform duration-200 ${selectedServices.includes(svc) ? 'scale-100' : 'scale-0'}`} />
                </div>
                <span className={`text-sm font-bold transition-colors ${selectedServices.includes(svc) ? 'text-primary' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                  {svc}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Distance slider */}
      <div className="space-y-6">
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Khoảng cách</p>
        <div className="px-2">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setDistanceKm(prev => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-lg font-bold">-</span>
            </button>
            <div className="flex items-end">
              <span className="text-2xl font-black text-primary dark:text-white">{distanceKm}</span>
              <span className="text-xs font-bold text-slate-400 pb-1 ml-1 dark:text-white">km</span>
            </div>
            <button 
              onClick={() => setDistanceKm(prev => Math.min(30, prev + 1))}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="text-lg font-bold">+</span>
            </button>
          </div>
          <input
            type="range"
            min={1}
            max={30}
            value={distanceKm}
            onChange={(e) => setDistanceKm(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-primary bg-slate-100 dark:bg-slate-800 "
          />
          <div className="flex justify-between text-[10px] font-black text-slate-300 dark:text-white mt-2">
            <span>1 KM</span>
            <span>30 KM</span>
          </div>
        </div>
      </div>

      <button 
        onClick={() => { setIsMapModalOpen(true); setIsMobileFilterOpen(false); }}
        className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-slate-900 text-white font-black text-xs hover:bg-primary transition-all shadow-xl hover:shadow-primary/20 uppercase tracking-widest">
        <MapIcon size={16} />
        Xem trên bản đồ
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-display relative">
      {/* Page-wide background decoration — matches LandingPage */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-mesh opacity-10 dark:opacity-20" />
        <div className="absolute top-[2%] -left-[10%] w-[50%] h-[35%] bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-[120px]" />
        <div className="absolute top-[5%] right-[5%] w-[40%] h-[30%] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-[100px]" />
        <div className="pattern-dots absolute inset-0 opacity-20" />
      </div>

      {/* ── Hero Banner ── */}
      <div className="relative text-blue-950 dark:text-white pt-20 md:pt-24 pb-24 md:pb-32 px-4 md:px-6 overflow-hidden z-10">

        <div className="max-w-5xl mx-auto relative z-10 text-center space-y-5 md:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 md:space-y-4"
          >
            <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.15em] md:tracking-[0.2em] text-emerald-600 dark:text-emerald-400 shadow-sm">
              <CheckCircle2 size={12} />
              Cơ sở đã được xác thực
            </span>
            <h1 className="text-3xl md:text-6xl font-black tracking-tight leading-tight text-blue-950 dark:text-white drop-shadow-sm">
              Tìm cơ sở <span className="text-gradient">thú y</span> <br />
              &amp; Dịch vụ quanh bạn
            </h1>
          </motion.div>

          {/* Premium Search Bar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full glass dark:glass-dark p-2 md:p-2 rounded-[32px] md:rounded-full shadow-3xl max-w-4xl mx-auto group focus-within:ring-4 md:focus-within:ring-8 ring-primary/10 transition-all"
          >
            <div className="flex flex-col md:grid md:grid-cols-12 gap-1.5 md:gap-2 w-full">
              <div className="md:col-span-5 relative">
                <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-primary dark:text-white w-4 h-4 md:w-5 md:h-5" />
                <input
                  type="text"
                  placeholder="Tên cơ sở, dịch vụ..."
                  className="w-full pl-11 md:pl-14 pr-4 py-3.5 md:py-5 bg-white/50 dark:bg-slate-900/50 rounded-full border-none focus:ring-0 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 text-sm md:text-base"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-4 relative md:border-l border-slate-100 dark:border-slate-800">
                <MapPin className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 text-secondary dark:text-white w-4 h-4 md:w-5 md:h-5" />
                <input
                  type="text"
                  placeholder="Khu vực, thành phố..."
                  className="w-full pl-11 md:pl-14 pr-4 py-3.5 md:py-5 bg-white/30 md:bg-transparent dark:bg-slate-900/30 md:dark:bg-transparent rounded-full border-none focus:ring-0 text-slate-900 dark:text-white font-bold placeholder:text-slate-400 text-sm md:text-base"
                  value={cityQuery}
                  onChange={(e) => setCityQuery(e.target.value)}
                />
              </div>
              <div className="md:col-span-3">
                <button className="w-full h-full bg-primary hover:bg-primary-dark text-white rounded-full font-black transition-all flex items-center justify-center gap-2 py-3.5 md:py-5 shadow-xl shadow-primary/20 text-sm md:text-base">
                  <Search size={16} />
                  TÌM KIẾM
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 -mt-8 md:-mt-12 relative z-20 pb-24">
        {/* ── Category Tabs (horizontally scrollable on mobile) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 md:mb-10"
        >
          <div className="flex overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-2 md:pb-0 snap-x snap-mandatory">
            <div className="inline-flex bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-1 md:p-1.5 rounded-full shadow-md shadow-slate-200/50 dark:shadow-slate-900/50 backdrop-blur-sm">
              {SHOP_TYPE_TABS.map((tab) => {
                const isActive = activeService === tab.value;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setActiveService(tab.value)}
                    className={`relative flex items-center gap-1.5 md:gap-2 px-4 md:px-6 py-2.5 md:py-3.5 rounded-full text-xs md:text-sm font-black whitespace-nowrap transition-all z-10 snap-start ${isActive
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="active-pill"
                        className="absolute inset-0 bg-primary rounded-full shadow-lg shadow-primary/25"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5 md:gap-2">
                      {tab.icon}
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
          {/* ── Desktop Sidebar ── */}
          <aside className="hidden lg:block w-72 shrink-0 space-y-6">
            <div className="bg-white dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200/70 dark:border-slate-800/70 p-6 rounded-[32px] space-y-8 sticky top-28 shadow-md shadow-slate-200/40 dark:shadow-slate-900/40">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-primary dark:text-white" />
                  Bộ lọc
                </h3>
                {(minRating > 0 || distanceKm !== 30 || selectedServices.length > 0) && (
                  <button
                    onClick={() => { setMinRating(0); setDistanceKm(30); setSelectedServices([]); }}
                    className="text-[10px] font-black text-primary dark:text-white uppercase tracking-wider hover:underline"
                  >
                    Đặt lại
                  </button>
                )}
              </div>
              {filterContent}
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0">
            {/* Results header */}
            <div className="flex items-center justify-between mb-6 md:mb-8 gap-3">
              <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white truncate">
                  {isLoading ? 'Đang tìm kiếm...' : `${totalElements} kết quả phù hợp`}
                </h2>
                <p className="text-xs md:text-sm font-medium text-slate-500 mt-0.5">Dựa trên tiêu chí lựa chọn của bạn</p>
              </div>

              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                {/* Mobile filter button */}
                <button 
                  onClick={() => setIsMobileFilterOpen(true)}
                  className="lg:hidden relative p-2.5 glass dark:glass-dark rounded-xl text-slate-600 dark:text-white hover:text-primary transition-colors"
                >
                  <SlidersHorizontal size={18} />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                <div className="relative glass dark:glass-dark rounded-xl md:rounded-2xl p-1 hidden sm:flex">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 dark:text-white hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <ListIcon size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 md:p-2.5 rounded-lg md:rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 dark:text-white hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    <Grid size={16} />
                  </button>
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="glass dark:glass-dark border-none rounded-xl md:rounded-2xl text-[11px] md:text-xs font-black px-3 md:px-4 py-2.5 md:py-3 text-slate-700 dark:text-slate-300 outline-none cursor-pointer max-w-[140px] md:max-w-none"
                >
                  {SORT_OPTIONS.map((opt) => <option key={opt}>{opt}</option>)}
                </select>
              </div>
            </div>

            {/* Cards Grid/List — on mobile always vertical cards */}
            <div
              className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6' : 'flex flex-col gap-4 md:gap-6'}
            >
              {isLoading ? (
                <>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`glass dark:glass-dark rounded-2xl md:rounded-[32px] overflow-hidden ${viewMode === 'list' ? 'flex flex-col sm:flex-row h-auto sm:h-56' : 'h-[360px] md:h-[400px]'}`}>
                      <div className="bg-slate-100 dark:bg-slate-800 animate-pulse shrink-0 w-full h-44 sm:h-full" />
                      <div className="flex-1 p-4 md:p-6 space-y-3">
                        <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-3/4" />
                        <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-1/2" />
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse w-full" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                sortedClinics.map((shop: ShopPublicResponse, index: number) => (
                  <div key={`${shop.id}-${index}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <Link
                      to={`/clinic/${shop.id}`}
                      className={`group bg-white dark:bg-slate-900/60 rounded-2xl md:rounded-[32px] overflow-hidden hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/50 hover:-translate-y-1 transition-all duration-500 border border-slate-200/85 dark:border-slate-800/80 hover:border-primary/20 dark:hover:border-blue-500/30 h-full ${viewMode === 'list' ? 'flex flex-col sm:flex-row sm:h-64' : 'flex flex-col'}`}
                    >
                      {/* Image */}
                      <div className={`relative overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 ${viewMode === 'list' ? 'sm:w-72 w-full h-44 sm:h-auto' : 'h-44 md:h-52'}`}>
                        <img
                          src={shop.licenseImageUrl || 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=800&auto=format&fit=crop'}
                          alt={shop.shopName}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                        {/* Badges */}
                        <div className="absolute top-3 md:top-4 left-3 md:left-4 flex flex-col gap-2">
                          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                            <CheckCircle2 size={10} className="text-white" />
                            ĐỐI TÁC
                          </span>
                        </div>

                        {shop.shopType && (
                          <span className="absolute bottom-3 md:bottom-4 left-3 md:left-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-primary text-[9px] font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl uppercase tracking-widest dark:text-white">
                            {SHOP_TYPE_TABS.find(t => t.value === shop.shopType)?.label ?? shop.shopType}
                          </span>
                        )}
                      </div>

                      {/* Info Content */}
                      <div className="flex-1 p-4 md:p-6 flex flex-col justify-between">
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="font-black text-slate-900 dark:text-white text-base md:text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                              {shop.shopName}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0 bg-amber-50 dark:bg-amber-400/10 px-2 md:px-2.5 py-1 md:py-1.5 rounded-lg md:rounded-xl border border-amber-100 dark:border-amber-400/20">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              <span className="font-black text-amber-700 dark:text-amber-400 text-[11px] md:text-xs">
                                {shop.ratingAvg > 0 ? shop.ratingAvg.toFixed(1) : 'Mới'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {(shop as any).distanceKm !== undefined && (
                              <div className="flex items-center gap-1 text-teal-600 dark:text-teal-400 text-[11px] md:text-xs font-black bg-teal-50 dark:bg-teal-400/10 w-fit px-2 py-0.5 md:py-1 rounded-md md:rounded-lg">
                                <MapPin size={11} />
                                {(shop as any).distanceKm.toFixed(1)} km
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] md:text-xs font-medium min-w-0">
                              <MapPin size={12} className="text-slate-400 dark:text-white shrink-0" />
                              <span className="truncate">{shop.address}{shop.city ? `, ${shop.city}` : ''}</span>
                            </div>
                          </div>

                          {shop.description && (
                            <p className="text-[11px] md:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed font-medium hidden sm:block">
                              {shop.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-4 md:mt-6 pt-3 md:pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-white">
                              <Phone size={12} />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider hidden sm:inline">{shop.phone}</span>
                          </div>
                          <div className="flex items-center gap-1.5 md:gap-2 text-primary font-black text-[10px] md:text-[10px] uppercase tracking-widest group-hover:gap-3 transition-all dark:text-white">
                            Xem chi tiết
                            <ChevronRight size={14} />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>

            {/* Pagination – mobile-friendly */}
            {!isLoading && totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between mt-8 gap-4">
                <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 order-2 sm:order-1">
                  Trang {page + 1} / {totalPages}
                </p>
                <div className="flex items-center gap-1.5 md:gap-2 order-1 sm:order-2 flex-wrap justify-center">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 md:px-5 py-2 md:py-2.5 glass dark:glass-dark rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter(i => {
                      // On mobile, show fewer page numbers
                      const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
                      const range = isMobile ? 1 : 2;
                      return Math.abs(i - page) <= range;
                    })
                    .map(i => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl text-[11px] md:text-xs font-black transition-all ${
                        i === page
                          ? 'bg-primary text-white shadow-lg shadow-primary/25'
                          : 'glass dark:glass-dark text-slate-600 dark:text-white hover:border-primary/50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 md:px-5 py-2 md:py-2.5 glass dark:glass-dark rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-600 dark:text-white hover:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sau →
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && sortedClinics.length === 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 md:py-32 glass dark:glass-dark rounded-2xl md:rounded-[40px] space-y-5 md:space-y-6 px-6"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-xl md:text-2xl text-slate-900 dark:text-white">
                    Không tìm thấy kết quả
                  </h3>
                  <p className="text-slate-400 font-medium text-sm md:text-base">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm</p>
                </div>
                <button
                  onClick={() => { setSearchQuery(''); setCityQuery(''); setActiveService('Tất cả'); setMinRating(0); setSelectedServices([]); }}
                  className="px-6 md:px-8 py-3 md:py-4 bg-primary text-white text-xs font-black rounded-2xl hover:bg-primary-dark transition-all shadow-xl shadow-primary/20 uppercase tracking-widest"
                >
                  Xóa tất cả bộ lọc
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mobile Map FAB ── */}
      <div className="lg:hidden fixed bottom-6 right-6 z-[80]">
        <button
          onClick={() => setIsMapModalOpen(true)}
          className="bg-primary text-white p-4 rounded-full shadow-lg shadow-primary/30 flex items-center justify-center gap-2 hover:bg-blue-600 transition-all border-4 border-white dark:border-slate-800 active:scale-95"
        >
          <MapIcon size={20} />
          <span className="font-bold text-sm pr-1">Bản đồ</span>
        </button>
      </div>

      {/* ── Mobile Filter Bottom Sheet ── */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] lg:hidden"
              onClick={() => setIsMobileFilterOpen(false)}
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[91] lg:hidden bg-white dark:bg-slate-900 rounded-t-[28px] shadow-2xl max-h-[85vh] flex flex-col"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-primary" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">Bộ lọc</h3>
                  {activeFilterCount > 0 && (
                    <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full">
                      {activeFilterCount} đang áp dụng
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => { setMinRating(0); setDistanceKm(30); setSelectedServices([]); }}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      Xóa hết
                    </button>
                  )}
                  <button 
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 overscroll-contain">
                {filterContent}
              </div>

              {/* Apply button */}
              <div className="shrink-0 p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 safe-area-bottom">
                <button
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/25 text-sm uppercase tracking-widest active:scale-[0.98] transition-transform"
                >
                  Áp dụng bộ lọc ({totalElements} kết quả)
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Map Modal */}
      <AnimatePresence>
        {isMapModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 50 }}
              className="bg-white dark:bg-slate-900 w-full md:max-w-6xl h-[92vh] md:h-[85vh] rounded-t-[28px] md:rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative"
            >
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors backdrop-blur-md"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-2/3 h-[45%] md:h-full relative bg-slate-100 dark:bg-slate-800">
                {userLocation ? (
                  <ShopMap 
                    userLocation={userLocation}
                    nearbyShops={shopsForMap}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                    <MapPin size={40} className="mb-3 text-slate-300" />
                    <p className="font-medium text-base">Đang lấy vị trí của bạn...</p>
                    <p className="text-xs mt-1.5 opacity-70">Vui lòng cho phép truy cập vị trí trong trình duyệt</p>
                  </div>
                )}
              </div>
              <div className="w-full md:w-1/3 flex-1 md:h-full bg-slate-50 dark:bg-slate-950 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 flex flex-col">
                <div className="p-4 md:p-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                  <h3 className="font-black text-lg md:text-xl text-slate-900 dark:text-white flex items-center gap-2">
                    <MapIcon size={20} className="text-primary" />
                    Bản đồ các cơ sở
                  </h3>
                  <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">
                    Hiển thị {allShopsForList.length} kết quả ({shopsForMap.length} có vị trí trên bản đồ)
                  </p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                  <NearbyShops shops={allShopsForList} loading={isLoading} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radius Confirmation Modal */}
      <AnimatePresence>
        {showRadiusModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setShowRadiusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 50 }}
              className="bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[32px] shadow-2xl w-full sm:max-w-md p-6 md:p-8 relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-500" />
              <button onClick={() => setShowRadiusModal(false)} className="absolute top-5 md:top-6 right-5 md:right-6 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-50 dark:bg-blue-900/30 text-blue-500 rounded-full flex items-center justify-center mb-5 md:mb-6 relative">
                  <div className="absolute inset-0 bg-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                  <Navigation size={30} className="fill-blue-500/20" />
                </div>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white mb-2 md:mb-3">Đã kích hoạt bộ lọc</h3>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  Hệ thống đang hiển thị tất cả các cơ sở thú y quanh bạn trong bán kính <span className="font-black text-primary text-base md:text-lg">{radiusParam} km</span>.
                </p>
                <button 
                  onClick={() => setShowRadiusModal(false)}
                  className="mt-6 md:mt-8 w-full py-3.5 md:py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95"
                >
                  Tuyệt vời, Khám phá ngay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
