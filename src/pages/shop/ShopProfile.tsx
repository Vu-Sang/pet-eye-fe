import React, { useState, useEffect } from 'react';
import { Store, MapPin, Phone, Mail, Clock, Camera, Save, Loader2, ShieldCheck, Image as ImageIcon, CalendarX, Plus, X, Calendar, Volume2, VolumeX, Bell } from 'lucide-react';
import { shopService } from '../../services/shop.service';
import { fileService } from '../../services/file.service';
import toast from 'react-hot-toast';
import { useTheme } from '../../contexts/ThemeContext';

export interface CustomGalleryBlock {
  id: string;
  type: '1x1' | '1x2' | '2x1' | '2x2' | '3x2';
  url: string;
}

export default function ShopProfile() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('shop_notif_sound_enabled') !== 'false';
  });
  const [soundMode, setSoundMode] = useState(() => {
    return localStorage.getItem('shop_notif_sound_mode') || 'once';
  });
  const [isTestingSound, setIsTestingSound] = useState(false);
  const testAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // Sync to localStorage
  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem('shop_notif_sound_enabled', String(enabled));
    if (!enabled && isTestingSound) {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      setIsTestingSound(false);
    }
  };

  const handleChangeSoundMode = (mode: string) => {
    setSoundMode(mode);
    localStorage.setItem('shop_notif_sound_mode', mode);
  };

  const handleTestSound = () => {
    if (isTestingSound) {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
        testAudioRef.current = null;
      }
      setIsTestingSound(false);
    } else {
      const audio = new Audio('/assets/sounds/notification.mp4');
      testAudioRef.current = audio;
      
      let playCount = 1;
      audio.play().catch(() => {
        toast.error('Không thể phát âm thanh thử.');
      });
      setIsTestingSound(true);
      
      audio.onended = () => {
        if (soundMode === 'loop' && playCount < 5) {
          playCount++;
          audio.play().catch(() => {});
        } else {
          setIsTestingSound(false);
          testAudioRef.current = null;
        }
      };
    }
  };

  // Cleanup test audio on unmount
  useEffect(() => {
    return () => {
      if (testAudioRef.current) {
        testAudioRef.current.pause();
      }
    };
  }, []);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const bannerInputRef = React.useRef<HTMLInputElement>(null);
  const galleryInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const SHOP_TYPES = [
    { value: 'CLINIC', label: 'Phòng khám thú y' },
    { value: 'SPA', label: 'Spa & Grooming' },
    { value: 'HOTEL', label: 'Khách sạn thú cưng' },
    { value: 'MIXED', label: 'Dịch vụ tổng hợp' }
  ];

  const [shopInfo, setShopInfo] = useState({
    name: '',
    type: [] as string[],
    email: '',
    phone: '',
    address: '',
    city: '',
    description: '',
    openTime: '08:00',
    closeTime: '20:00',
    workingDays: [] as string[],
    offDays: [] as string[],
    logoUrl: '',
    bannerUrl: '',
    galleryUrls: '',
    galleryLayout: 'AUTO',
    customGalleryConfig: '[]',
    useBannerInGallery: true,
    isVerified: false,
    socialLinks: '[]',
    lateGracePeriod: 15,
  });

  const VIETNAM_CITIES = [
    'Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 
    'Bình Dương', 'Đồng Nai', 'Khánh Hòa', 'Lâm Đồng', 'Quảng Ninh'
  ];

  useEffect(() => {
    fetchShopProfile();
  }, []);

  const fetchShopProfile = async () => {
    try {
      setLoading(true);
      const data = await shopService.getMyShop();
      console.log('API getMyShop returned:', data);
      setShopInfo(prev => ({
        ...prev,
        name: data.shopName || prev.name,
        type: data.shopType ? data.shopType.split(',').filter(Boolean) : prev.type,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        city: data.city || prev.city,
        description: data.description || prev.description,
        openTime: data.openTime || prev.openTime,
        closeTime: data.closeTime || prev.closeTime,
        workingDays: data.workingDays ? data.workingDays.split(',') : prev.workingDays,
        offDays: data.offDays ? data.offDays.split(',') : prev.offDays,
        logoUrl: data.logoUrl || prev.logoUrl,
        bannerUrl: data.bannerUrl || prev.bannerUrl,
        galleryUrls: data.galleryUrls || prev.galleryUrls,
        galleryLayout: data.galleryLayout || 'AUTO',
        customGalleryConfig: data.customGalleryConfig || '[]',
        useBannerInGallery: data.useBannerInGallery ?? true,
        socialLinks: data.socialLinks || '[]',
        isVerified: data.isVerified,
        lateGracePeriod: data.lateGracePeriod ?? prev.lateGracePeriod,
      }));
    } catch (err) {
      console.error('Failed to fetch shop profile:', err);
      toast.error('Không thể tải thông tin cửa hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted. Current shopInfo:', shopInfo);
    try {
      setSaving(true);
      setError(null);
      const updateData = {
        shopName: shopInfo.name,
        shopType: shopInfo.type.join(','),
        email: shopInfo.email,
        phone: shopInfo.phone,
        address: shopInfo.address,
        city: shopInfo.city,
        description: shopInfo.description,
        openTime: shopInfo.openTime,
        closeTime: shopInfo.closeTime,
        workingDays: shopInfo.workingDays.join(','),
        offDays: shopInfo.offDays.join(','),
        logoUrl: shopInfo.logoUrl,
        bannerUrl: shopInfo.bannerUrl,
        galleryUrls: shopInfo.galleryUrls,
        galleryLayout: shopInfo.galleryLayout,
        customGalleryConfig: shopInfo.customGalleryConfig,
        useBannerInGallery: shopInfo.useBannerInGallery,
        socialLinks: shopInfo.socialLinks,
        lateGracePeriod: shopInfo.lateGracePeriod,
      };
      console.log('Sending update request with data:', updateData);
      const data = await shopService.updateMyShop(updateData);
      
      // Update state safely using prev state
      setShopInfo(prev => ({
        ...prev,
        name: data.shopName || prev.name,
        type: data.shopType ? data.shopType.split(',').filter(Boolean) : prev.type,
        email: data.email || prev.email,
        phone: data.phone || prev.phone,
        address: data.address || prev.address,
        city: data.city || prev.city,
        description: data.description || prev.description,
        openTime: data.openTime || prev.openTime,
        closeTime: data.closeTime || prev.closeTime,
        workingDays: data.workingDays ? data.workingDays.split(',') : prev.workingDays,
        offDays: data.offDays ? data.offDays.split(',') : prev.offDays,
        logoUrl: data.logoUrl || prev.logoUrl,
        bannerUrl: data.bannerUrl || prev.bannerUrl,
        galleryUrls: data.galleryUrls || prev.galleryUrls,
        galleryLayout: data.galleryLayout || prev.galleryLayout,
        customGalleryConfig: data.customGalleryConfig || prev.customGalleryConfig,
        useBannerInGallery: data.useBannerInGallery ?? prev.useBannerInGallery,
        socialLinks: data.socialLinks || prev.socialLinks,
        isVerified: data.isVerified,
        lateGracePeriod: data.lateGracePeriod ?? prev.lateGracePeriod,
      }));
      
      toast.success('Đã cập nhật thông tin cửa hàng!');
    } catch (err: any) {
      console.error('Failed to update shop profile:', err.response?.data || err);
      const errorMsg = err.response?.data?.message || err.response?.data?.error || 'Cập nhật thông tin thất bại.';
      toast.error(`Lỗi: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 2MB');
      return;
    }

    try {
      if (type === 'gallery') {
        const currentImages = shopInfo.galleryUrls ? shopInfo.galleryUrls.split(',').filter(Boolean) : [];
        if (currentImages.length >= 10) {
          toast.error('Đã đạt giới hạn 10 ảnh tối đa.');
          return;
        }
        setUploadingGallery(true);
      } else if (type === 'logo') {
        setUploadingLogo(true);
      } else {
        setUploadingBanner(true);
      }

      const url = await fileService.upload(file);
      
      let updatedInfo = { ...shopInfo };
      if (type === 'gallery') {
        updatedInfo.galleryUrls = updatedInfo.galleryUrls ? `${updatedInfo.galleryUrls},${url}` : url;
      } else {
        updatedInfo[type === 'logo' ? 'logoUrl' : 'bannerUrl'] = url;
      }
      setShopInfo(updatedInfo);
      
      // Auto-save
      const updateData = {
        shopName: updatedInfo.name,
        shopType: updatedInfo.type.join(','),
        email: updatedInfo.email,
        phone: updatedInfo.phone,
        address: updatedInfo.address,
        city: updatedInfo.city,
        description: updatedInfo.description,
        openTime: updatedInfo.openTime,
        closeTime: updatedInfo.closeTime,
        workingDays: updatedInfo.workingDays.join(','),
        offDays: updatedInfo.offDays.join(','),
        logoUrl: updatedInfo.logoUrl,
        bannerUrl: updatedInfo.bannerUrl,
        galleryUrls: updatedInfo.galleryUrls,
        facebookUrl: updatedInfo.facebookUrl,
        websiteUrl: updatedInfo.websiteUrl,
        lateGracePeriod: updatedInfo.lateGracePeriod,
      };
      await shopService.updateMyShop(updateData);
      
      toast.success(`Đã tải ${type === 'logo' ? 'logo' : type === 'banner' ? 'ảnh bìa' : 'ảnh thư viện'} lên thành công!`);
    } catch (err) {
      console.error('Upload failed:', err);
      toast.error('Tải ảnh lên thất bại');
    } finally {
      if (type === 'logo') setUploadingLogo(false);
      else if (type === 'banner') setUploadingBanner(false);
      else setUploadingGallery(false);
    }
  };

  const moveGalleryImage = async (index: number, direction: 'left' | 'right') => {
    const currentUrls = shopInfo.galleryUrls.split(',').filter(Boolean);
    if (direction === 'left' && index > 0) {
      const temp = currentUrls[index];
      currentUrls[index] = currentUrls[index - 1];
      currentUrls[index - 1] = temp;
    } else if (direction === 'right' && index < currentUrls.length - 1) {
      const temp = currentUrls[index];
      currentUrls[index] = currentUrls[index + 1];
      currentUrls[index + 1] = temp;
    } else {
      return; // No movement possible
    }
    
    const updatedUrls = currentUrls.join(',');
    const updatedInfo = { ...shopInfo, galleryUrls: updatedUrls };
    setShopInfo(updatedInfo);
    
    try {
      await shopService.updateMyShop({ galleryUrls: updatedUrls });
    } catch (err) {
      console.error('Failed to update gallery order:', err);
      toast.error('Lỗi khi sắp xếp ảnh');
    }
  };

  const setAsCoverImage = async (index: number) => {
    if (index === 0) return;
    const currentUrls = shopInfo.galleryUrls.split(',').filter(Boolean);
    const coverUrl = currentUrls.splice(index, 1)[0];
    currentUrls.unshift(coverUrl); // put at index 0
    
    const updatedUrls = currentUrls.join(',');
    const updatedInfo = { ...shopInfo, galleryUrls: updatedUrls };
    setShopInfo(updatedInfo);
    
    try {
      await shopService.updateMyShop({ galleryUrls: updatedUrls });
    } catch (err) {
      console.error('Failed to set cover image:', err);
      toast.error('Lỗi khi đặt ảnh bìa');
    }
  };

  const removeGalleryImage = async (urlToRemove: string) => {
    const currentUrls = shopInfo.galleryUrls.split(',').filter(Boolean);
    const updatedUrls = currentUrls.filter(url => url !== urlToRemove).join(',');
    const updatedInfo = { ...shopInfo, galleryUrls: updatedUrls };
    setShopInfo(updatedInfo);
    
    try {
      const updateData = {
        shopName: updatedInfo.name,
        shopType: updatedInfo.type.join(','),
        email: updatedInfo.email,
        phone: updatedInfo.phone,
        address: updatedInfo.address,
        city: updatedInfo.city,
        description: updatedInfo.description,
        openTime: updatedInfo.openTime,
        closeTime: updatedInfo.closeTime,
        workingDays: updatedInfo.workingDays.join(','),
        offDays: updatedInfo.offDays.join(','),
        logoUrl: updatedInfo.logoUrl,
        bannerUrl: updatedInfo.bannerUrl,
        galleryUrls: updatedInfo.galleryUrls,
        lateGracePeriod: updatedInfo.lateGracePeriod,
      };
      await shopService.updateMyShop(updateData);
      toast.success('Đã xóa ảnh thành công!');
    } catch (err) {
      console.error('Remove failed:', err);
      toast.error('Xóa ảnh thất bại.');
    }
  };

  const weekDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];

  const toggleWorkingDay = (day: string) => {
    setShopInfo({
      ...shopInfo,
      workingDays: shopInfo.workingDays.includes(day)
        ? shopInfo.workingDays.filter(d => d !== day)
        : [...shopInfo.workingDays, day],
    });
  };

  const [newOffStartDate, setNewOffStartDate] = useState('');
  const [newOffEndDate, setNewOffEndDate] = useState('');

  const addOffDateRange = () => {
    if (!newOffStartDate) return;
    
    let datesToAdd: string[] = [];
    const start = new Date(newOffStartDate);
    
    if (newOffEndDate) {
      const end = new Date(newOffEndDate);
      if (end < start) {
        toast.error('Ngày kết thúc không được nhỏ hơn ngày bắt đầu!');
        return;
      }
      let current = new Date(start);
      while (current <= end) {
        // Handle timezone issues to get correct YYYY-MM-DD
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        datesToAdd.push(`${year}-${month}-${day}`);
        current.setDate(current.getDate() + 1);
      }
    } else {
      datesToAdd.push(newOffStartDate);
    }
    
    const currentOffDays = [...shopInfo.offDays];
    let addedCount = 0;
    
    datesToAdd.forEach(date => {
      if (!currentOffDays.includes(date)) {
        currentOffDays.push(date);
        addedCount++;
      }
    });
    
    if (addedCount === 0) {
      toast.error('Các ngày đã chọn đều đã có trong danh sách nghỉ!');
      return;
    }
    
    setShopInfo({ ...shopInfo, offDays: currentOffDays.sort() });
    setNewOffStartDate('');
    setNewOffEndDate('');
    if (datesToAdd.length > 1) {
      toast.success(`Đã thêm ${addedCount} ngày nghỉ vào danh sách!`);
    }
  };

  const removeOffDate = (dateToRemove: string) => {
    setShopInfo({ ...shopInfo, offDays: shopInfo.offDays.filter(d => d !== dateToRemove) });
  };

  console.log('Rendering ShopProfile with logo:', shopInfo.logoUrl);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-transparent' : 'bg-slate-50'}`}>
      <div className="max-w-5xl mx-auto px-6 py-8 animate-in fade-in duration-500">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className={`text-3xl font-black tracking-tight flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Store className={`w-8 h-8 ${isDark ? 'text-indigo-400' : 'text-blue-600'}`} />
              Thông tin cửa hàng
            </h1>
            <p className={`font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Quản lý thông tin và cài đặt cửa hàng của bạn
            </p>
          </div>
        </header>

        {error && (
          <div className={`border rounded-xl p-4 flex items-center gap-3 mb-6 ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-red-50 border-red-200 text-red-700'}`}>
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {loading ? (
          <div className={`flex flex-col items-center justify-center py-20 rounded-2xl shadow-sm ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white'}`}>
            <Loader2 size={40} className={`animate-spin mb-4 ${isDark ? 'text-indigo-400' : 'text-[#1a2b4c]'}`} />
            <p className={`font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đang tải thông tin cửa hàng...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {/* Shop Media */}
            <div className={`rounded-2xl p-8 shadow-sm border relative overflow-hidden transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
              <div className="absolute top-0 right-0 p-4">
                {shopInfo.isVerified && (
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${isDark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    <ShieldCheck size={14} />
                    Đã xác minh
                  </div>
                )}
              </div>
              
              <h3 className={`font-bold text-lg mb-6 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <Store size={20} className={isDark ? 'text-indigo-400' : 'text-primary'} />
                Hình ảnh cửa hàng
              </h3>
              
              <div className="space-y-8">
                {/* Banner Section */}
                <div className="relative group">
                  <div className={`w-full h-48 rounded-2xl overflow-hidden border ${isDark ? 'bg-slate-800/50 border-white/5' : 'bg-slate-100 border-slate-200'}`}>
                    {uploadingBanner ? (
                      <div className={`w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                        <Loader2 className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-primary'}`} size={32} />
                      </div>
                    ) : shopInfo.bannerUrl ? (
                      <img src={shopInfo.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex flex-col items-center justify-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        <ImageIcon size={40} className="mb-2" />
                        <p className="text-xs font-medium">Chưa có ảnh bìa</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={bannerInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'banner')}
                  />
                  <button 
                    type="button" 
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploadingBanner}
                    className={`absolute bottom-4 right-4 p-2 backdrop-blur shadow-lg rounded-xl transition-all flex items-center gap-2 text-xs font-bold border disabled:opacity-50 ${isDark ? 'bg-slate-800/90 text-white border-white/10 hover:bg-slate-800' : 'bg-white/90 text-slate-700 border-slate-200 hover:bg-white'}`}
                  >
                    <Camera size={14} />
                    {uploadingBanner ? 'Đang tải...' : 'Thay ảnh bìa'}
                  </button>
                </div>

                {/* Logo & Info */}
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="relative">
                    <div className={`size-32 rounded-3xl p-1 shadow-xl border -mt-16 md:-mt-20 ml-4 relative z-10 overflow-hidden ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-100'}`}>
                      <div className={`w-full h-full rounded-[1.25rem] overflow-hidden flex items-center justify-center ${isDark ? 'bg-slate-900' : 'bg-slate-50'}`}>
                        {uploadingLogo ? (
                          <Loader2 className={`animate-spin ${isDark ? 'text-indigo-400' : 'text-primary'}`} size={24} />
                        ) : shopInfo.logoUrl ? (
                          <img src={shopInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Store size={40} className={isDark ? 'text-slate-700' : 'text-slate-200'} />
                        )}
                      </div>
                      <input 
                        type="file" 
                        ref={logoInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'logo')}
                      />
                      <button 
                        type="button" 
                        onClick={() => logoInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className={`absolute bottom-2 right-2 p-1.5 text-white rounded-lg shadow-lg hover:scale-110 transition-transform disabled:opacity-50 ${isDark ? 'bg-indigo-600' : 'bg-primary'}`}
                      >
                        <Camera size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 pt-2">
                    <h2 className={`text-2xl font-black flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {shopInfo.name || 'Tên cửa hàng'}
                    </h2>
                    <p className={`text-sm font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {shopInfo.type.length > 0 ? shopInfo.type.map(t => SHOP_TYPES.find(st => st.value === t)?.label || t).join(' + ') : 'Chưa cập nhật loại hình'} • {shopInfo.city || 'Chưa cập nhật địa chỉ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Photo Gallery */}
            <div className={`rounded-2xl p-8 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
              <h3 className={`font-bold text-lg mb-6 flex items-center justify-between gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <div className="flex items-center gap-2">
                  <ImageIcon size={20} className={isDark ? 'text-indigo-400' : 'text-primary'} />
                  Thư viện ảnh
                </div>
                
                <label className="flex items-center cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={shopInfo.useBannerInGallery !== false} 
                      onChange={(e) => {
                        const val = e.target.checked;
                        setShopInfo(prev => ({ ...prev, useBannerInGallery: val }));
                        shopService.updateMyShop({ useBannerInGallery: val }).catch(() => toast.error('Lỗi khi lưu cài đặt ảnh bìa'));
                      }} 
                    />
                    <div className={`block w-10 h-6 rounded-full transition-colors ${shopInfo.useBannerInGallery !== false ? 'bg-amber-500' : (isDark ? 'bg-slate-700' : 'bg-slate-300')}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${shopInfo.useBannerInGallery !== false ? 'transform translate-x-4' : ''}`}></div>
                  </div>
                  <div className={`ml-2 text-xs font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    Hiển thị ảnh bìa
                  </div>
                </label>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {shopInfo.galleryUrls.split(',').filter(Boolean).map((url, index, arr) => (
                  <div key={index} className={`relative group aspect-square rounded-xl overflow-hidden border ${isDark ? 'bg-slate-800 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                    <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" />

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(url)}
                          className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                          title="Xóa ảnh"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                      
                      <div className="flex justify-between items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveGalleryImage(index, 'left')}
                          disabled={index === 0}
                          className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded backdrop-blur-sm transition-colors"
                          title="Sang trái"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => moveGalleryImage(index, 'right')}
                          disabled={index === arr.length - 1}
                          className="p-1 bg-white/20 hover:bg-white/40 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded backdrop-blur-sm transition-colors"
                          title="Sang phải"
                        >
                          <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Upload Button */}
                {shopInfo.galleryUrls.split(',').filter(Boolean).length < 10 ? (
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    disabled={uploadingGallery}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all group disabled:opacity-50 ${isDark ? 'border-slate-700 text-slate-500 hover:border-indigo-500 hover:text-indigo-400' : 'border-slate-200 text-slate-400 hover:border-primary hover:text-primary'}`}
                  >
                    {uploadingGallery ? (
                      <Loader2 className="animate-spin" size={24} />
                    ) : (
                      <>
                        <div className={`size-10 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-800/50 group-hover:bg-indigo-500/20' : 'bg-slate-50 group-hover:bg-primary/10'}`}>
                          <span className="material-symbols-outlined">add_photo_alternate</span>
                        </div>
                        <span className="text-xs font-bold">Thêm ảnh</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-70 ${isDark ? 'border-slate-700 text-slate-500 bg-slate-800/30' : 'border-slate-200 text-slate-400 bg-slate-50'}`}>
                     <span className="material-symbols-outlined text-red-400">block</span>
                     <span className="text-[10px] font-bold text-center px-2">Đã đạt tối đa 10 ảnh</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={galleryInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, 'gallery')}
              />
              <div className={`mt-6 border rounded-xl p-4 ${isDark ? 'bg-indigo-900/20 border-indigo-500/20' : 'bg-blue-50/50 border-blue-100'}`}>
                <h4 className={`text-sm font-bold mb-2 flex items-center gap-2 ${isDark ? 'text-indigo-300' : 'text-blue-900'}`}>
                  <span className={`material-symbols-outlined text-lg ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>view_quilt</span>
                  Tùy chọn bố cục thư viện ảnh
                </h4>
                <p className={`text-xs mb-3 leading-relaxed ${isDark ? 'text-indigo-200/70' : 'text-blue-800/80'}`}>
                  Bạn có thể chọn bố cục ảnh cố định hoặc để hệ thống tự động sắp xếp dựa trên số lượng ảnh. Ảnh bìa của cửa hàng (Hình ảnh cửa hàng) sẽ luôn hiển thị lớn nhất ở vị trí chính.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4">
                  {[
                    { id: 'AUTO', label: 'Tự động' },
                    { id: 'LAYOUT_1', label: '1 ảnh' },
                    { id: 'LAYOUT_2', label: '2 ảnh' },
                    { id: 'LAYOUT_3', label: '3 ảnh' },
                    { id: 'LAYOUT_5_PLUS', label: '5+ ảnh' },
                    { id: 'CUSTOM', label: 'Tự thiết kế' }
                  ].map((layout) => {
                    const isSelected = (shopInfo.galleryLayout || 'AUTO') === layout.id;
                    return (
                      <div 
                        key={layout.id} 
                        onClick={() => {
                          const newLayout = layout.id;
                          setShopInfo(prev => ({ ...prev, galleryLayout: newLayout }));
                          shopService.updateMyShop({ galleryLayout: newLayout }).catch(() => toast.error('Lỗi khi lưu bố cục'));
                        }}
                        className={`flex flex-col gap-2 items-center cursor-pointer transition-all p-2 rounded-xl border-2 ${isSelected ? 'border-amber-500 bg-amber-50' : 'border-transparent hover:border-blue-200'}`}
                      >
                        <div className="w-full aspect-[4/3] relative">
                          {layout.id === 'AUTO' && (
                            <div className={`w-full h-full flex flex-col items-center justify-center rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700 text-slate-500' : 'bg-slate-100/50 border-slate-300 text-slate-400'}`}>
                              <span className="material-symbols-outlined text-3xl mb-1">auto_awesome</span>
                            </div>
                          )}
                          {layout.id === 'LAYOUT_1' && (
                            <div className="w-full h-full bg-blue-100/50 rounded-lg border border-blue-200"></div>
                          )}
                          {layout.id === 'LAYOUT_2' && (
                            <div className="w-full h-full grid grid-cols-2 gap-1">
                              <div className="bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                              <div className="bg-blue-100/50 rounded-r-lg border border-blue-200"></div>
                            </div>
                          )}
                          {layout.id === 'LAYOUT_3' && (
                            <div className="w-full h-full grid grid-cols-3 gap-1">
                              <div className="col-span-2 bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                              <div className="col-span-1 grid grid-rows-2 gap-1">
                                <div className="bg-blue-100/50 rounded-tr-lg border border-blue-200"></div>
                                <div className="bg-blue-100/50 rounded-br-lg border border-blue-200"></div>
                              </div>
                            </div>
                          )}
                          {layout.id === 'LAYOUT_5_PLUS' && (
                            <div className="w-full h-full grid grid-cols-4 grid-rows-2 gap-1">
                              <div className="col-span-2 row-span-2 bg-blue-100/50 rounded-l-lg border border-blue-200"></div>
                              <div className="col-span-1 row-span-1 bg-blue-100/50 border border-blue-200"></div>
                              <div className="col-span-1 row-span-1 bg-blue-100/50 rounded-tr-lg border border-blue-200"></div>
                              <div className="col-span-1 row-span-1 bg-blue-100/50 border border-blue-200"></div>
                              <div className="col-span-1 row-span-1 flex items-center justify-center bg-blue-100/50 rounded-br-lg border border-blue-200 relative">
                                <span className="absolute text-[10px] font-bold text-blue-600">+</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-600' : (isDark ? 'text-indigo-300' : 'text-blue-900')}`}>{layout.label}</span>
                      </div>
                    );
                  })}
                </div>
                {shopInfo.galleryLayout === 'CUSTOM' && (
                  <div className={`mt-6 p-4 rounded-xl border ${isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-blue-200'}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <h5 className={`font-bold text-sm ${isDark ? 'text-indigo-300' : 'text-blue-900'}`}>Tự do xếp ô (Kéo thả ảnh)</h5>
                      <div className="flex gap-2 flex-wrap">
                        {[
                          { type: '1x1', label: 'Vuông nhỏ', icon: 'crop_square' },
                          { type: '2x1', label: 'Chữ nhật ngang', icon: 'crop_7_5' },
                          { type: '1x2', label: 'Chữ nhật dọc', icon: 'crop_5_4' },
                          { type: '2x2', label: 'Vuông lớn', icon: 'crop_din' },
                          { type: '3x2', label: 'Chữ nhật siêu lớn', icon: 'view_agenda' },
                        ].map((btn) => (
                          <button
                            key={btn.type}
                            onClick={() => {
                              try {
                                const parsed = JSON.parse(shopInfo.customGalleryConfig || '[]');
                                const currentBlocks = Array.isArray(parsed) ? parsed : [];
                                const newBlock: CustomGalleryBlock = { id: Date.now().toString(), type: btn.type as any, url: '' };
                                setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify([...currentBlocks, newBlock]) }));
                              } catch {
                                setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify([{ id: Date.now().toString(), type: btn.type, url: '' }]) }));
                              }
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                          >
                            <span className="material-symbols-outlined text-[14px]">{btn.icon}</span> {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="w-full md:w-1/3">
                        <h6 className={`text-xs font-bold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Kho ảnh (Kéo từ đây)</h6>
                        <div className="grid grid-cols-3 gap-2 overflow-y-auto max-h-[400px] p-1">
                          {[shopInfo.bannerUrl, ...(shopInfo.galleryUrls ? shopInfo.galleryUrls.split(',') : [])].filter(Boolean).map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', url)}
                              className="w-full aspect-square object-cover rounded cursor-grab hover:opacity-80 border border-slate-200 shadow-sm"
                              alt="Source"
                            />
                          ))}
                        </div>
                      </div>

                      <div className="w-full md:w-2/3">
                        <h6 className={`text-xs font-bold mb-2 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <span>Khung thiết kế (Tự động khít)</span>
                          <span className="text-[10px] font-normal italic opacity-70">Có thể kéo thả từng khối để đổi thứ tự</span>
                        </h6>
                        <div className={`grid grid-cols-4 md:grid-cols-6 auto-rows-[60px] sm:auto-rows-[80px] md:auto-rows-[100px] grid-flow-dense gap-2 min-h-[200px] p-3 rounded-xl border-2 border-dashed ${isDark ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50/50'}`}>
                          {(() => {
                            let customBlocks: CustomGalleryBlock[] = [];
                            try {
                              const parsed = JSON.parse(shopInfo.customGalleryConfig || '[]');
                              customBlocks = Array.isArray(parsed) ? parsed : [];
                            } catch {}

                            if (customBlocks.length === 0) {
                              return (
                                <div className="col-span-full flex flex-col items-center justify-center h-40 opacity-50">
                                  <span className="material-symbols-outlined text-4xl mb-2">grid_view</span>
                                  <span className="text-xs font-bold">Chưa có khối ảnh nào. Hãy thêm khối ở trên.</span>
                                </div>
                              );
                            }

                            return customBlocks.map((block, index) => {
                              let spanClass = "col-span-1 row-span-1"; // 1x1 default
                              if (block.type === '1x2') spanClass = "col-span-1 row-span-2";
                              else if (block.type === '2x1') spanClass = "col-span-2 row-span-1";
                              else if (block.type === '2x2') spanClass = "col-span-2 row-span-2";
                              else if (block.type === '3x2') spanClass = "col-span-3 row-span-2";

                              return (
                                <div 
                                  key={block.id} 
                                  draggable
                                  className={`relative group ${spanClass} flex items-center justify-center overflow-hidden rounded-lg transition-colors border-2 border-dashed cursor-move ${isDark ? 'border-slate-600 bg-slate-800 hover:bg-slate-700' : 'border-slate-300 bg-white hover:bg-blue-50/50'}`}
                                  onDragStart={(e) => {
                                    // Set block index for block reordering
                                    e.dataTransfer.setData('source-block-index', index.toString());
                                  }}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    const url = e.dataTransfer.getData('text/plain');
                                    const sourceIndexStr = e.dataTransfer.getData('source-block-index');
                                    
                                    if (url) {
                                      const newBlocks = [...customBlocks];
                                      newBlocks[index].url = url;
                                      setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                    } else if (sourceIndexStr) {
                                      const sourceIndex = parseInt(sourceIndexStr, 10);
                                      if (!isNaN(sourceIndex) && sourceIndex !== index) {
                                        const newBlocks = [...customBlocks];
                                        const [movedBlock] = newBlocks.splice(sourceIndex, 1);
                                        newBlocks.splice(index, 0, movedBlock);
                                        setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                      }
                                    }
                                  }}
                                >
                                  {/* Delete btn */}
                                  <button
                                    onClick={() => {
                                      const newBlocks = [...customBlocks];
                                      newBlocks.splice(index, 1);
                                      setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                    }}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-sm"
                                  >
                                    <X size={12} />
                                  </button>

                                  {/* Reorder btns */}
                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                    <button
                                      disabled={index === 0}
                                      onClick={() => {
                                        if (index > 0) {
                                          const newBlocks = [...customBlocks];
                                          [newBlocks[index - 1], newBlocks[index]] = [newBlocks[index], newBlocks[index - 1]];
                                          setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                        }
                                      }}
                                      className="bg-slate-900/60 hover:bg-slate-900 text-white rounded p-0.5 disabled:opacity-30"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                                    </button>
                                    <button
                                      disabled={index === customBlocks.length - 1}
                                      onClick={() => {
                                        if (index < customBlocks.length - 1) {
                                          const newBlocks = [...customBlocks];
                                          [newBlocks[index + 1], newBlocks[index]] = [newBlocks[index], newBlocks[index + 1]];
                                          setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                        }
                                      }}
                                      className="bg-slate-900/60 hover:bg-slate-900 text-white rounded p-0.5 disabled:opacity-30"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </button>
                                  </div>

                                  {block.url ? (
                                    <>
                                      <img src={block.url} className="w-full h-full object-cover pointer-events-none" alt="Block" />
                                      <button
                                        onClick={() => {
                                          const newBlocks = [...customBlocks];
                                          newBlocks[index].url = '';
                                          setShopInfo(prev => ({ ...prev, customGalleryConfig: JSON.stringify(newBlocks) }));
                                        }}
                                        className="absolute top-2 left-2 bg-slate-900/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                      >
                                        <span className="material-symbols-outlined text-[14px]">delete</span>
                                      </button>
                                    </>
                                  ) : (
                                    <span className="material-symbols-outlined text-slate-300 text-2xl">add_photo_alternate</span>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          {/* Basic Info */}
          <div className={`rounded-xl p-6 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Thông tin cơ bản</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Tên cửa hàng *
                </label>
                <input
                  type="text"
                  value={shopInfo.name}
                  onChange={(e) => setShopInfo({ ...shopInfo, name: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền tên cửa hàng.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Loại hình *
                </label>
                <div className="flex flex-wrap gap-2">
                  {SHOP_TYPES.map((st) => {
                    const isSelected = shopInfo.type.includes(st.value);
                    const concreteSelected = shopInfo.type.filter(v => v !== 'MIXED');
                    const isMixedDisabled = st.value === 'MIXED' && concreteSelected.length >= 2;
                    return (
                      <button
                        key={st.value}
                        type="button"
                        disabled={isMixedDisabled}
                        onClick={() => {
                          setShopInfo(prev => {
                            if (st.value === 'MIXED') {
                              return { ...prev, type: ['MIXED'] };
                            }
                            if (prev.type.includes('MIXED')) {
                              return { ...prev, type: [st.value] };
                            }
                            if (prev.type.includes(st.value)) {
                              return { ...prev, type: prev.type.filter(v => v !== st.value) };
                            }
                            if (prev.type.length >= 2) {
                              return prev;
                            }
                            return { ...prev, type: [...prev.type, st.value] };
                          });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                          isMixedDisabled
                            ? (isDark ? 'border-slate-700 text-slate-600 cursor-not-allowed bg-slate-800/30' : 'border-slate-200 text-slate-300 cursor-not-allowed bg-slate-50')
                            : isSelected
                            ? (isDark ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'border-[#1a2b4c] bg-[#1a2b4c] text-white shadow-md')
                            : (isDark ? 'border-slate-600 text-slate-300 hover:border-indigo-500 hover:bg-indigo-500/10' : 'border-slate-200 text-slate-700 hover:border-[#1a2b4c] hover:bg-slate-50')
                        }`}
                      >
                        {st.label}
                      </button>
                    );
                  })}
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  Chọn tối đa 2 loại hình. "Dịch vụ tổng hợp" = cả 3 loại.
                </p>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Email *
                </label>
                <input
                  type="email"
                  value={shopInfo.email}
                  onChange={(e) => setShopInfo({ ...shopInfo, email: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền địa chỉ email.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Số điện thoại *
                </label>
                <input
                  type="tel"
                  value={shopInfo.phone}
                  onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền số điện thoại.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500 placeholder-slate-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder-slate-400'}`}
                  placeholder="Ví dụ: 0912345678"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <div className={`flex items-center justify-between mb-4`}>
                  <label className={`block text-sm font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Liên kết mạng xã hội
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        const links = JSON.parse(shopInfo.socialLinks || '[]');
                        links.push({ id: Date.now().toString(), type: 'FACEBOOK', url: '', label: '' });
                        setShopInfo({ ...shopInfo, socialLinks: JSON.stringify(links) });
                      } catch {
                        setShopInfo({ ...shopInfo, socialLinks: JSON.stringify([{ id: Date.now().toString(), type: 'FACEBOOK', url: '', label: '' }]) });
                      }
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors border ${isDark ? 'bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-700' : 'bg-[#1a2b4c] border-[#1a2b4c] text-white hover:bg-[#1a2b4c]/90'}`}
                  >
                    <Plus size={14} /> Thêm liên kết
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(() => {
                    let links: any[] = [];
                    try {
                      links = JSON.parse(shopInfo.socialLinks || '[]');
                    } catch {}
                    
                    if (links.length === 0) {
                      return (
                        <div className={`p-4 rounded-xl border border-dashed text-center ${isDark ? 'border-slate-700 bg-slate-800/30 text-slate-500' : 'border-slate-300 bg-slate-50 text-slate-500'}`}>
                          <p className="text-sm font-medium">Chưa có liên kết nào. Bấm "Thêm liên kết" để tạo mới.</p>
                        </div>
                      );
                    }
                    
                    return links.map((link, index) => (
                      <div key={link.id} className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                        <select
                          value={link.type}
                          onChange={(e) => {
                            const newLinks = [...links];
                            newLinks[index].type = e.target.value;
                            setShopInfo({ ...shopInfo, socialLinks: JSON.stringify(newLinks) });
                          }}
                          className={`w-full sm:w-40 px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500/50' : 'bg-slate-50 border-slate-200 text-slate-900 focus:ring-indigo-500/20'}`}
                        >
                          <option value="FACEBOOK">Facebook</option>
                          <option value="INSTAGRAM">Instagram</option>
                          <option value="TIKTOK">TikTok</option>
                          <option value="WEBSITE">Website</option>
                          <option value="YOUTUBE">YouTube</option>
                          <option value="ZALO">Zalo</option>
                          <option value="OTHER">Khác</option>
                        </select>
                        
                        {link.type === 'OTHER' && (
                          <input
                            type="text"
                            value={link.label || ''}
                            onChange={(e) => {
                              const newLinks = [...links];
                              newLinks[index].label = e.target.value;
                              setShopInfo({ ...shopInfo, socialLinks: JSON.stringify(newLinks) });
                            }}
                            placeholder="Tên hiển thị"
                            className={`w-full sm:w-40 px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500/50' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20'}`}
                          />
                        )}
                        
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => {
                            const newLinks = [...links];
                            newLinks[index].url = e.target.value;
                            setShopInfo({ ...shopInfo, socialLinks: JSON.stringify(newLinks) });
                          }}
                          placeholder="Nhập đường dẫn (https://...)"
                          required
                          className={`flex-1 w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-indigo-500/50' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20'}`}
                        />
                        
                        <button
                          type="button"
                          onClick={() => {
                            const newLinks = [...links];
                            newLinks.splice(index, 1);
                            setShopInfo({ ...shopInfo, socialLinks: JSON.stringify(newLinks) });
                          }}
                          className={`p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0`}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Thành phố/Tỉnh *
                </label>
                <select
                  value={shopInfo.city}
                  onChange={(e) => setShopInfo({ ...shopInfo, city: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLSelectElement).setCustomValidity('Vui lòng chọn thành phố.')}
                  onInput={(e) => (e.target as HTMLSelectElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                >
                  <option value="" className={isDark ? 'bg-slate-800 text-white' : ''}>Chọn thành phố</option>
                  {VIETNAM_CITIES.map(city => (
                    <option key={city} value={city} className={isDark ? 'bg-slate-800 text-white' : ''}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Địa chỉ *
                </label>
                <input
                  type="text"
                  value={shopInfo.address}
                  onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                  onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('Vui lòng điền địa chỉ.')}
                  onInput={(e) => (e.target as HTMLInputElement).setCustomValidity('')}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Mô tả
                </label>
                <textarea
                  value={shopInfo.description}
                  onChange={(e) => setShopInfo({ ...shopInfo, description: e.target.value })}
                  rows={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none resize-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                />
              </div>
            </div>
          </div>

          {/* Working Hours */}
          <div className={`rounded-xl p-6 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
            <h3 className={`font-bold text-lg mb-4 ${isDark ? 'text-white' : 'text-slate-900'}`}>Giờ làm việc</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Giờ mở cửa
                  </label>
                  <input
                    type="time"
                    value={shopInfo.openTime}
                    onChange={(e) => setShopInfo({ ...shopInfo, openTime: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    Giờ đóng cửa
                  </label>
                  <input
                    type="time"
                    value={shopInfo.closeTime}
                    onChange={(e) => setShopInfo({ ...shopInfo, closeTime: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-3 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Ngày làm việc
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWorkingDay(day)}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                        shopInfo.workingDays.includes(day)
                          ? (isDark ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-[#1a2b4c] text-white')
                          : (isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Thời gian chờ tối đa (Grace Period)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="5"
                    max="30"
                    value={shopInfo.lateGracePeriod}
                    onChange={(e) => setShopInfo({ ...shopInfo, lateGracePeriod: parseInt(e.target.value) || 15 })}
                    className={`w-32 px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all ${isDark ? 'bg-slate-800/50 border-slate-700 text-white focus:ring-indigo-500/50 focus:border-indigo-500' : 'bg-white border-slate-200 text-slate-900 focus:ring-indigo-500/20 focus:border-indigo-500'}`}
                  />
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>phút (Từ 5 đến 30 phút)</span>
                </div>
                <p className={`text-xs mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Nếu khách hàng đến trễ quá thời gian này, nhân viên sẽ có quyền hủy lịch hẹn và cửa hàng sẽ giữ lại tiền cọc (No-Show).
                </p>
              </div>

              {/* Shop Off Days */}
              <div className={`mt-8 pt-8 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left config side */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className={`font-black text-lg flex items-center gap-2 mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDark ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'}`}>
                          <CalendarX size={16} />
                        </div>
                        Cấu hình ngày nghỉ
                      </h4>
                      <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        Khách hàng sẽ không thể đặt lịch vào các ngày này. Chọn 1 ngày hoặc chọn khoảng thời gian.
                      </p>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Từ ngày</label>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={newOffStartDate}
                              onChange={(e) => setNewOffStartDate(e.target.value)}
                              min={new Date().toISOString().split('T')[0]} 
                              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30' : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#1a2b4c]/10'}`}
                            />
                          </div>
                        </div>
                        <div>
                          <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Đến ngày (Tùy chọn)</label>
                          <div className="relative">
                            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="date"
                              value={newOffEndDate}
                              onChange={(e) => setNewOffEndDate(e.target.value)}
                              min={newOffStartDate || new Date().toISOString().split('T')[0]}
                              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm font-bold outline-none transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:ring-2 focus:ring-indigo-500/30' : 'bg-white border-slate-200 text-slate-900 focus:ring-2 focus:ring-[#1a2b4c]/10'}`}
                            />
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addOffDateRange}
                        disabled={!newOffStartDate}
                        className={`w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${isDark ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' : 'bg-rose-100 text-rose-600 hover:bg-rose-200'}`}
                      >
                        <Plus size={14} /> Thêm ngày nghỉ
                      </button>
                    </div>
                  </div>

                  {/* Right display side */}
                  <div className="flex-1">
                    <div className={`h-full rounded-2xl border p-5 flex flex-col ${isDark ? 'bg-slate-800/30 border-slate-700/50' : 'bg-slate-50 border-slate-200/60'}`}>
                      <h5 className={`text-sm font-black mb-4 flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Danh sách ngày nghỉ
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{shopInfo.offDays.length} ngày</span>
                      </h5>
                      <div className="flex-1 overflow-y-auto max-h-[220px] custom-scrollbar pr-2">
                        {shopInfo.offDays.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-8">
                            <CalendarX size={32} className="mb-2" />
                            <p className="text-xs font-bold">Chưa có ngày nghỉ nào được thiết lập.</p>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {shopInfo.offDays.map((date) => (
                              <div key={date} className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:border-rose-500/50' : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300'}`}>
                                <Calendar size={12} className="opacity-50" />
                                {date.split('-').reverse().join('/')}
                                <button
                                  type="button"
                                  onClick={() => removeOffDate(date)}
                                  className={`p-0.5 rounded-md transition-colors ${isDark ? 'text-slate-500 hover:bg-rose-500/20 hover:text-rose-400' : 'text-slate-400 hover:bg-rose-100 hover:text-rose-600'}`}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Notification Sound Settings */}
            <div className={`rounded-xl p-6 shadow-sm border transition-all ${isDark ? 'admin-glass-card bg-slate-900/40 border-white/10' : 'bg-white border-slate-100'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                <div>
                  <h3 className={`font-bold text-lg flex items-center gap-2.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {soundEnabled ? (
                      <Volume2 size={20} className="text-indigo-500 animate-pulse" />
                    ) : (
                      <VolumeX size={20} className="text-slate-400" />
                    )}
                    Âm thanh thông báo đơn hàng
                  </h3>
                  <p className={`text-xs mt-1 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Cài đặt âm thanh báo khi có lịch đặt hẹn mới từ khách hàng
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={!soundEnabled}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border flex items-center gap-2 ${
                    !soundEnabled 
                      ? 'border-slate-200 text-slate-400 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-not-allowed opacity-50'
                      : isTestingSound
                        ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500'
                        : isDark
                          ? 'bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border-indigo-500/20'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-indigo-100'
                  }`}
                >
                  {isTestingSound ? (
                    <>
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      Dừng nghe thử
                    </>
                  ) : (
                    'Nghe thử âm thanh'
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                {/* Switch Enable/Disable */}
                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                  isDark ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50 border-slate-200/50'
                }`}>
                  <div>
                    <span className={`block text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                      Kích hoạt chuông báo
                    </span>
                    <span className={`block text-[10px] mt-0.5 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Phát âm thanh thông báo khi có đơn hàng mới
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSound(!soundEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      soundEnabled ? 'bg-green-500' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        soundEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Mode Select */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  !soundEnabled 
                    ? 'opacity-55 pointer-events-none'
                    : ''
                } ${
                  isDark ? 'bg-slate-800/20 border-slate-700/50' : 'bg-slate-50 border-slate-200/50'
                }`}>
                  <span className={`block text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                    Chế độ phát chuông
                  </span>
                  <div className="flex gap-4 mt-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="soundMode"
                        value="once"
                        checked={soundMode === 'once'}
                        onChange={() => handleChangeSoundMode('once')}
                        className="text-indigo-600 focus:ring-indigo-500 size-4 border-slate-300"
                      />
                      Phát 1 lần
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <input
                        type="radio"
                        name="soundMode"
                        value="loop"
                        checked={soundMode === 'loop'}
                        onChange={() => handleChangeSoundMode('loop')}
                        className="text-indigo-600 focus:ring-indigo-500 size-4 border-slate-300"
                      />
                      Lặp lại (Tối đa 5 lần)
                    </label>
                  </div>
                  <span className={`block text-[10px] mt-2 font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    * Chế độ lặp lại sẽ tự động tắt chuông sau 5 lần phát nếu không được tắt thủ công để tránh làm phiền.
                  </span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className={`px-6 py-3 border rounded-xl font-semibold transition-all ${isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                disabled={saving}
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className={`flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-lg disabled:opacity-70 ${isDark ? 'bg-indigo-600 shadow-indigo-500/20' : 'bg-[#1a2b4c]'}`}
              >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
