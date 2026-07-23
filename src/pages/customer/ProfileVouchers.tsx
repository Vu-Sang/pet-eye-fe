import React, { useState, useEffect } from 'react';
import { userService } from '../../services/user.service';

export default function ProfileVouchers() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const data = await userService.getMyVouchers();
        setVouchers(data || []);
      } catch (error) {
        console.error('Failed to fetch vouchers', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVouchers();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const formatServiceCategory = (category: string | null) => {
    if (!category) return 'Tất cả dịch vụ';
    const catMap: Record<string, string> = {
      'SPA': 'Dịch vụ Spa',
      'GROOMING': 'Cắt tỉa lông',
      'HOTEL': 'Khách sạn thú cưng',
      'CLINIC': 'Phòng khám thú y',
    };
    return catMap[category] || category;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Không xác định';
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl text-slate-900 dark:text-slate-100 tracking-tight font-bold">Voucher của tôi</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Quản lý và xem hạn sử dụng các ưu đãi bạn đã nhận được.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 md:p-8 min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse bg-slate-50 dark:bg-slate-800 rounded-2xl h-40 w-full flex border border-slate-200 dark:border-slate-700">
                <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-l-2xl h-full border-r border-dashed border-slate-300 dark:border-slate-600"></div>
                <div className="flex-1 p-5 flex flex-col justify-center gap-3">
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                  <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-full mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : vouchers.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {vouchers.map((uv: any) => {
              const v = uv.voucher;
              if (!v) return null;
              
              const isPercentage = v.discountType === 'PERCENTAGE';
              const discountText = isPercentage ? `${v.discountValue}%` : formatCurrency(v.discountValue);
              const isUsed = uv.isUsed || uv.used; // Jackson might serialize boolean isUsed as just 'used'
              const isExpired = uv.expiresAt && new Date(uv.expiresAt) < new Date();
              const statusDisabled = isUsed || isExpired;
              const serviceText = formatServiceCategory(v.targetServiceCategory);

              return (
                <div 
                  key={uv.id} 
                  className={`group relative flex bg-white dark:bg-slate-800 rounded-2xl border ${statusDisabled ? 'border-slate-200 dark:border-slate-700 opacity-70' : 'border-teal-200 dark:border-teal-900/50 hover:border-teal-400 hover:shadow-xl hover:shadow-teal-900/10 dark:hover:border-teal-500'} overflow-hidden transition-all duration-300 transform ${!statusDisabled && 'hover:-translate-y-1'}`}
                >
                  {/* Left part (Ticket Stub) */}
                  <div className={`w-32 sm:w-36 flex-shrink-0 flex flex-col items-center justify-center p-4 border-r-2 border-dashed ${statusDisabled ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700' : 'bg-gradient-to-br from-teal-50 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/20 border-teal-200 dark:border-teal-700'} relative`}>
                     {/* Cutouts */}
                     <div className="absolute top-0 -translate-y-1/2 -right-[13px] w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-transparent z-10 hidden sm:block"></div>
                     <div className="absolute bottom-0 translate-y-1/2 -right-[13px] w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-transparent z-10 hidden sm:block"></div>
                     
                     <span className={`material-symbols-outlined text-4xl sm:text-5xl mb-2 ${statusDisabled ? 'text-slate-300 dark:text-slate-600' : 'text-teal-600 dark:text-teal-400'} ${!statusDisabled && 'group-hover:scale-110'} transition-transform duration-300 drop-shadow-sm`}>
                        local_activity
                     </span>
                     <div className={`text-xl sm:text-2xl font-black ${statusDisabled ? 'text-slate-500 dark:text-slate-400' : 'text-teal-700 dark:text-teal-300'} text-center leading-tight drop-shadow-sm`}>
                        {discountText}
                     </div>
                     <div className={`text-[10px] sm:text-xs font-bold uppercase mt-1 ${statusDisabled ? 'text-slate-400' : 'text-teal-600/80 dark:text-teal-400/80'} tracking-widest`}>
                        Giảm Giá
                     </div>
                  </div>

                  {/* Right part (Details) */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between relative">
                     {/* Decorative pattern for active vouchers */}
                     {!statusDisabled && (
                       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                         <span className="material-symbols-outlined text-8xl transform rotate-12">local_activity</span>
                       </div>
                     )}
                  
                     <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3 gap-2">
                           <h3 className={`font-bold text-base sm:text-lg leading-tight line-clamp-2 ${statusDisabled ? 'text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
                              Voucher Giảm {discountText}
                           </h3>
                           {isUsed && (
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold rounded-full border border-slate-200 dark:border-slate-700 shrink-0 uppercase tracking-wider">Đã dùng</span>
                           )}
                           {isExpired && !isUsed && (
                              <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-500 text-[10px] font-bold rounded-full border border-red-200 dark:border-red-800 shrink-0 uppercase tracking-wider">Hết hạn</span>
                           )}
                        </div>
                        
                        <ul className="space-y-2 mb-4">
                           <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">pets</span>
                              <span>Áp dụng cho: <strong className="text-slate-800 dark:text-slate-200">{serviceText}</strong></span>
                           </li>
                           <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">shopping_bag</span>
                              <span>Đơn tối thiểu: <strong className="text-slate-800 dark:text-slate-200">{v.minOrderValue ? formatCurrency(v.minOrderValue) : '0đ'}</strong></span>
                           </li>
                           <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">event</span>
                              <span>HSD: <strong className="text-slate-800 dark:text-slate-200">{uv.expiresAt ? formatDate(uv.expiresAt) : `${v.validDays} ngày kể từ khi nhận`}</strong></span>
                           </li>
                           {v.maxDiscountAmount && (
                           <li className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                              <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-slate-500">arrow_downward</span>
                              <span>Giảm tối đa: <strong className="text-slate-800 dark:text-slate-200">{formatCurrency(v.maxDiscountAmount)}</strong></span>
                           </li>
                           )}
                        </ul>
                     </div>

                     <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 relative z-10">
                        <div className="flex items-center gap-2">
                           <span className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold rounded-lg border border-slate-200 dark:border-slate-700 tracking-widest shadow-inner">
                              {v.code}
                           </span>
                           <button 
                              onClick={() => copyToClipboard(v.code)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/30 transition-colors border border-transparent hover:border-teal-200 dark:hover:border-teal-800 active:scale-95"
                              title="Sao chép mã"
                           >
                              <span className="material-symbols-outlined text-[16px]">content_copy</span>
                           </button>
                        </div>
                        {!statusDisabled && (
                           <span className="text-xs font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 cursor-pointer hover:underline">
                              Sử dụng <span className="material-symbols-outlined text-sm">arrow_forward</span>
                           </span>
                        )}
                     </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-20 text-center animate-in fade-in zoom-in duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/10 rounded-full flex items-center justify-center mb-6 shadow-inner border border-teal-100 dark:border-teal-900/30">
               <span className="material-symbols-outlined text-5xl text-teal-400 dark:text-teal-500/70">confirmation_number</span>
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-3">Chưa có voucher nào</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm leading-relaxed">
               Bạn chưa sở hữu voucher nào. Hãy trải nghiệm dịch vụ tại Peteye để nhận ngay những ưu đãi hấp dẫn dành riêng cho bạn!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
