import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { bookingService } from '../../services/booking.service';
import { trackBookingStep4_PaymentStart, trackSelectPaymentMethod, trackSelectVoucher } from '../../lib/analytics';
import { useTheme } from '../../contexts/ThemeContext';
type PayMethod = 'payos' | 'cash';

function formatVND(n: number) {
  return n.toLocaleString('vi-VN') + 'đ';
}

interface BookingService {
  id: number;
  name: string;
  price: number;
  durationMinutes?: number;
  category?: string;
  cameraEnabled?: boolean;
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  const booking = location.state as {
    shopId: number;
    shopName: string;
    shopAddress: string;
    shopImage?: string;
    serviceId: number;
    services?: BookingService[];
    serviceName: string;
    servicePrice: number;
    petId: number;
    petName: string;
    petNote?: string;
    staffId?: number;
    staffName?: string;
    appointmentDatetime: string;
    checkIn?: string;
    checkOut?: string;
    date: string;
    time: string;
    cageSize?: string;
    roomType?: string;
  } | null;

  const [payMethod, setPayMethod] = useState<PayMethod>('payos');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bookingNote, setBookingNote] = useState('');
  
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);

  React.useEffect(() => {
    // Fetch user vouchers on mount
    import('../../services/user.service').then(({ userService }) => {
      userService.getMyVouchers()
        .then(data => setMyVouchers(data))
        .catch(err => console.error("Failed to fetch vouchers", err));
    });
  }, []);

  // Dùng services[] nếu có, fallback về serviceName/servicePrice cũ
  const serviceList: BookingService[] = booking?.services && booking.services.length > 0
    ? booking.services
    : booking ? [{ id: booking.serviceId, name: booking.serviceName, price: booking.servicePrice }] : [];

  const rawTotalPrice = serviceList.reduce((sum, s) => sum + s.price, 0);

  React.useEffect(() => {
    if (booking) {
      trackBookingStep4_PaymentStart(
        booking.shopId,
        booking.shopName,
        rawTotalPrice,
        serviceList.map(s => s.name)
      );
    }
  }, [booking?.shopId, booking?.shopName, rawTotalPrice]);

  if (!booking) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 p-8">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 block mb-3">calendar_month</span>
          <p className="text-slate-500 font-semibold mb-4">Không có thông tin đặt lịch.</p>
          <Link to="/search" className="px-5 py-2.5 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] transition-colors">
            Tìm cơ sở
          </Link>
        </div>
      </div>
    );
  }



  const getCommissionRateForService = (svc: BookingService) => {
    if (!svc.category) return 0.10;
    const cat = svc.category.toUpperCase();
    if (cat.includes('GROOMING') || cat.includes('SPA')) return 0.18;
    if ((cat.includes('BOARDING') || cat.includes('HOTEL')) && svc.cameraEnabled) return 0.25;
    if (cat.includes('CLINIC')) return 0.10;
    return 0.10;
  };

  const rawDepositAmount = serviceList.reduce((sum, s) => sum + (s.price * getCommissionRateForService(s)), 0);

  let depositAmount = Math.ceil(rawDepositAmount);
  depositAmount = Math.max(depositAmount, 2000);
  if (depositAmount % 1000 !== 0) {
    depositAmount = Math.floor(depositAmount / 1000 + 1) * 1000;
  }

  // Tính thời gian dự kiến hoàn thành
  const totalDurationMinutes = serviceList.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  let estimatedEndTime = '';
  if (booking.time && totalDurationMinutes > 0 && !booking.time.includes('ngày')) {
    const [hours, minutes] = booking.time.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const start = new Date();
      start.setHours(hours, minutes, 0, 0);
      const end = new Date(start.getTime() + totalDurationMinutes * 60000);
      estimatedEndTime = end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Voucher logic
  let discountAmount = 0;
  let totalPrice = rawTotalPrice;
  if (payMethod === 'payos' && selectedVoucherId) {
    const voucher = myVouchers.find(v => v.id === selectedVoucherId)?.voucher;
    if (voucher) {
      if (voucher.discountType === 'PERCENTAGE') {
        discountAmount = rawTotalPrice * (voucher.discountValue / 100);
      } else {
        discountAmount = voucher.discountValue;
      }
      totalPrice = Math.max(0, rawTotalPrice - discountAmount);
    }
  }

  async function handlePay() {
    if (!agreed || loading) return;
    setLoading(true);
    setError('');

    const combinedNote = bookingNote.trim()
      ? (booking.petNote ? `${booking.petNote}\n—\nGhi chú thêm: ${bookingNote.trim()}` : bookingNote.trim())
      : (booking.petNote || '');

    const serviceIds = serviceList.map(s => s.id);
    
    // Lưu tạm thông tin đơn hàng để nếu bị lỗi / huỷ vẫn hiện được lên trang PaymentFailure
    const summaryData = {
      shopName: booking.shopName,
      shopAddress: booking.shopAddress,
      shopImage: booking.shopImage,
      services: serviceList,
      totalPrice: payMethod === 'cash' ? depositAmount : totalPrice,
      isDeposit: payMethod === 'cash'
    };
    localStorage.setItem('pendingBookingSummary', JSON.stringify(summaryData));

    if (payMethod === 'cash') {
      if ((booking as any).updateBookingId) {
        try {
          const result = await (bookingService as any).updateBooking((booking as any).updateBookingId, {
            shopId: booking.shopId,
            serviceId: booking.serviceId,
            serviceIds: serviceIds,
            petId: booking.petId,
            staffId: booking.staffId,
            appointmentDatetime: booking.appointmentDatetime,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            note: combinedNote,
            cageSize: booking.cageSize || '',
            roomType: booking.roomType,
            paymentMethod: "CASH"
          });
          if (result.checkoutUrl) {
            localStorage.setItem('pendingCashDeposit', result.orderCode?.toString() || '');
            window.location.href = result.checkoutUrl;
          } else {
            navigate('/payment-result?status=SUCCESS');
          }
        } catch (e: any) {
          setError(e?.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
          setLoading(false);
        }
        return;
      }
      try {
        // Cash flow: tạo PayOS link cho 10% tiền cọc
        const result = await bookingService.initiateCashDeposit({
          shopId: booking.shopId,
          serviceId: booking.serviceId,
          serviceIds: serviceIds,
          petId: booking.petId,
          staffId: booking.staffId,
          appointmentDatetime: booking.appointmentDatetime,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          note: combinedNote,
          paymentMethod: payMethod === 'cash' ? "CASH" : "PAYOS",
          cageSize: booking.cageSize || '',
          roomType: booking.roomType,
        });
        if (result.checkoutUrl) {
          // Lưu flag để PaymentResult biết đây là cash deposit
          // Dùng localStorage vì sessionStorage bị xóa khi redirect sang domain khác (PayOS)
          localStorage.setItem('pendingCashDeposit', result.orderCode.toString());
          window.location.href = result.checkoutUrl;
        } else {
          setError('Không lấy được link thanh toán cọc. Vui lòng thử lại.');
          setLoading(false);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
        setLoading(false);
      }
      return;
    }

    if ((booking as any).updateBookingId) {
      try {
        const result = await bookingService.updateBooking((booking as any).updateBookingId, {
          shopId: booking.shopId,
          serviceId: booking.serviceId,
          serviceIds: serviceIds,
          petId: booking.petId,
          staffId: booking.staffId,
          appointmentDatetime: booking.appointmentDatetime,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          note: combinedNote,
          cageSize: booking.cageSize,
          roomType: booking.roomType,
          userVoucherId: payMethod === 'payos' && selectedVoucherId ? selectedVoucherId : undefined,
          paymentMethod: "PAYOS"
        });
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl;
        } else {
          navigate('/payment-result?status=SUCCESS');
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
        setLoading(false);
      }
      return;
    }

    try {
      const result = await bookingService.initiatePayment({
        shopId: booking.shopId,
        serviceId: booking.serviceId,
        serviceIds: serviceIds,
        petId: booking.petId,
        staffId: booking.staffId,
        appointmentDatetime: booking.appointmentDatetime,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        note: combinedNote,
        cageSize: booking.cageSize,
        roomType: booking.roomType,
        userVoucherId: payMethod === 'payos' && selectedVoucherId ? selectedVoucherId : undefined,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        setError('Không lấy được link thanh toán. Vui lòng thử lại.');
        setLoading(false);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Tạo đơn thanh toán thất bại. Vui lòng thử lại.');
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 pt-20 sm:pt-24 lg:pt-28">
      {/* Breadcrumb */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-slate-400">
          <Link to="/user/dashboard" className="hover:text-[#1a2b4c] flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">home</span>Trang chủ
          </Link>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <button onClick={() => navigate(-1)} className="hover:text-[#1a2b4c]">{booking.shopName}</button>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-slate-700 dark:text-slate-300 font-medium">Thanh toán</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100">Xác nhận & Thanh toán</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kiểm tra thông tin và hoàn tất đặt lịch của bạn</p>
        </div>

        {/* Steps indicator */}
        <div className="max-w-xl mx-auto mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#1a2b4c] dark:bg-teal-500 z-0 transition-all duration-500" style={{ width: '100%' }} />

            {['Dịch vụ', 'Thời gian', 'Thanh toán'].map((step, i) => {
              const isCompleted = i < 2;
              const isActive = i === 2;
              return (
                <div key={step} className="flex flex-col items-center relative z-10">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm border-2 ${
                    isCompleted 
                      ? 'bg-[#1a2b4c] border-[#1a2b4c] text-white dark:bg-teal-500 dark:border-teal-500' 
                      : isActive 
                        ? 'bg-white border-[#1a2b4c] text-[#1a2b4c] dark:bg-slate-800 dark:border-teal-500 dark:text-teal-400 scale-110 shadow-md shadow-indigo-500/10' 
                        : 'bg-white border-slate-200 text-slate-400 dark:bg-slate-800 dark:border-slate-700'
                  }`}>
                    {isCompleted ? (
                      <span className="material-symbols-outlined text-sm font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    ) : (
                      <span>{i + 1}</span>
                    )}
                  </div>
                  <span className={`text-[11px] sm:text-[12px] font-black uppercase tracking-wider mt-2.5 transition-colors ${
                    isActive 
                      ? 'text-[#1a2b4c] dark:text-teal-400' 
                      : isCompleted 
                        ? 'text-slate-650 dark:text-slate-400' 
                        : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Payment form */}
          <div className="flex flex-col gap-5">

            {/* Booking Ticket Pass */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.03)] relative overflow-hidden">
              <div className="p-5 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                  <span className="material-symbols-outlined text-sm text-indigo-500">local_activity</span>
                  Vé thông tin lịch hẹn
                </div>
                <div className="flex gap-4">
                  <div
                    className="w-20 h-20 rounded-2xl bg-cover bg-center shrink-0 bg-slate-100 border border-slate-100 dark:border-slate-700 shadow-sm"
                    style={{ backgroundImage: booking.shopImage ? `url(${booking.shopImage})` : 'url(https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=300&auto=format&fit=crop)' }}
                  />
                  <div className="flex-1 space-y-1">
                    <h3 className="font-black text-slate-900 dark:text-slate-100 text-base leading-snug">{booking.shopName}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-teal-500">location_on</span>
                      {booking.shopAddress}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-400 mt-2 font-bold">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs">🐾</span>
                      Thú cưng: <span className="text-[#1a2b4c] dark:text-teal-400 uppercase tracking-wider">{booking.petName}</span>
                    </div>
                    {booking.staffId && (
                      <div className="flex items-center gap-2 text-xs text-slate-650 dark:text-slate-400 mt-1 font-bold">
                        <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xs">👤</span>
                        Nhân viên: <span className="text-slate-800 dark:text-slate-200">{booking.staffName ?? `#${booking.staffId}`}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="relative h-4 flex items-center my-1">
                <div className="absolute left-[-8px] w-4 h-4 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 rounded-full z-10" />
                <div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700" />
                <div className="absolute right-[-8px] w-4 h-4 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 rounded-full z-10" />
              </div>

              <div className="p-5 pt-4 bg-slate-50/40 dark:bg-slate-800/40">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dịch vụ đã chọn</span>
                    <div className="flex flex-wrap gap-2">
                      {serviceList.map((svc) => (
                        <span key={svc.id} className="px-3 py-1 bg-white dark:bg-slate-750 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-lg border border-slate-150 dark:border-slate-700 flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                          {svc.name}
                          {svc.durationMinutes ? ` (${svc.durationMinutes} phút)` : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Thời gian hẹn</span>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-xs font-bold rounded-lg border border-indigo-100 dark:border-indigo-900/50 flex items-center gap-1.5 shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                        {booking.date}
                      </span>
                      <span className="px-3 py-1 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900/50 flex items-center gap-1.5 shadow-sm">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {booking.time}
                        {estimatedEndTime ? ` - Dự kiến xong: ${estimatedEndTime}` : ''}
                      </span>
                    </div>
                  </div>

                  {booking.petNote && (
                    <div className="pt-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Ghi chú sức khỏe thú cưng</span>
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic bg-amber-50/40 dark:bg-amber-950/10 border-l-2 border-amber-400 px-3 py-1.5 rounded-r-lg">
                        {booking.petNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Note for Shop */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">edit_note</span>
                Ghi chú cho cơ sở
              </h2>
              <textarea
                value={bookingNote}
                onChange={(e) => setBookingNote(e.target.value)}
                placeholder="Nhập ghi chú của bạn (VD: thú cưng hơi nhát người, cần chuẩn bị lồng rộng...)"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a2b4c] text-slate-700 dark:text-slate-200 min-h-[100px] resize-y"
              />
            </div>

            {/* Payment Method */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
              <h2 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">payments</span>
                Phương thức thanh toán
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                {([
                  { id: 'payos', icon: 'qr_code_2', label: 'Chuyển khoản QR (PayOS)', desc: 'Thanh toán trực tuyến bảo mật', badge: 'Khuyên dùng' },
                  { id: 'cash', icon: 'payments', label: 'Tiền mặt tại quầy', desc: 'Đặt cọc trước 10%, phần còn lại tại cơ sở', badge: 'Đặt cọc giữ lịch' },
                ] as { id: PayMethod; icon: string; label: string; desc: string; badge?: string }[]).map(m => {
                  const isSelected = payMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setPayMethod(m.id);
                        trackSelectPaymentMethod(m.id);
                      }}
                      className={`flex items-start gap-4 p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden group ${
                        isSelected
                          ? (isDark ? 'border-teal-500 bg-teal-950/20' : 'border-[#1a2b4c] bg-[#1a2b4c]/5 shadow-sm')
                          : (isDark ? 'border-slate-750 bg-slate-800/40 hover:border-slate-600' : 'border-slate-150 bg-white hover:border-slate-200')
                      }`}
                    >
                      {isSelected && (
                        <div className={`absolute top-0 right-0 w-8 h-8 flex items-center justify-center rounded-bl-2xl ${
                          isDark ? 'bg-teal-500 text-slate-900' : 'bg-[#1a2b4c] text-white'
                        }`}>
                          <span className="material-symbols-outlined text-sm font-bold">check</span>
                        </div>
                      )}

                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? (isDark ? 'bg-teal-500/20 text-teal-400' : 'bg-[#1a2b4c] text-white')
                          : (isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500')
                      }`}>
                        <span className="material-symbols-outlined text-2xl">{m.icon}</span>
                      </div>

                      <div className="pr-4 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-sm font-black ${
                            isSelected ? (isDark ? 'text-teal-400' : 'text-slate-900') : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {m.label}
                          </span>
                          {m.badge && (
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              m.id === 'payos'
                                ? 'bg-indigo-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-normal">{m.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {payMethod === 'payos' && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <span className="material-symbols-outlined text-blue-500 mt-0.5 text-xl">qr_code_2</span>
                  <div>
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">Thanh toán qua PayOS</p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1 leading-relaxed">
                      Bạn sẽ được chuyển sang trang PayOS để quét mã QR chuyển khoản ngân hàng. Sau khi thanh toán thành công, lịch hẹn sẽ được xác nhận tự động.
                    </p>
                  </div>
                </div>
              )}

              {payMethod === 'payos' && myVouchers.length > 0 && (
                <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-500">local_activity</span>
                    Mã giảm giá (Voucher)
                  </h3>
                  <select
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#1a2b4c] text-slate-700 dark:text-slate-200"
                    value={selectedVoucherId || ''}
                    onChange={(e) => {
                      const vId = e.target.value ? Number(e.target.value) : null;
                      setSelectedVoucherId(vId);
                      if (vId) {
                        const voucher = myVouchers.find(v => v.id === vId)?.voucher;
                        if (voucher) {
                          trackSelectVoucher(voucher.code, voucher.discountValue, voucher.discountType);
                        }
                      }
                    }}
                  >
                    <option value="">Không sử dụng voucher</option>
                    {myVouchers.map(uv => {
                      const v = uv.voucher;
                      const disabled = v.minOrderValue && rawTotalPrice < v.minOrderValue;
                      return (
                        <option key={uv.id} value={uv.id} disabled={disabled}>
                          {v.code} - Giảm {v.discountType === 'PERCENTAGE' ? `${v.discountValue}%` : formatVND(v.discountValue)} 
                          {v.minOrderValue ? ` (Đơn tối thiểu ${formatVND(v.minOrderValue)})` : ''}
                          {disabled ? ' - Chưa đủ điều kiện' : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {payMethod === 'cash' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <span className="material-symbols-outlined text-amber-500 mt-0.5">info</span>
                  <div>
                    <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">Thanh toán tại quầy — Đặt cọc giữ lịch</p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs mt-1 leading-relaxed">
                      Bạn cần thanh toán tiền cọc (tương đương phí nền tảng) qua PayOS ngay bây giờ để giữ lịch.
                      Phần còn lại sẽ được thanh toán trực tiếp tại cơ sở vào ngày hẹn.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Agreement */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-[#1a2b4c] focus:ring-[#1a2b4c]"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Tôi đồng ý với{' '}
                <a href="#" className="text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">Điều khoản dịch vụ</a>
                {' '}và{' '}
                <a href="#" className="text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">Chính sách hoàn tiền</a>
                {' '}của Peteye.
              </span>
            </label>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300 font-semibold">
                {error}
              </div>
            )}
          </div>

          {/* Right: Summary */}
          <div>
            <div className="sticky top-24 bg-white dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-3">Chi tiết hóa đơn</h2>

              {/* Từng dịch vụ */}
              <div className="space-y-3.5">
                {serviceList.map((svc) => {
                  const rate = getCommissionRateForService(svc);
                  return (
                    <div key={svc.id} className="flex flex-col text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between items-start text-sm">
                        <span className="flex-1 pr-4 font-bold text-slate-800 dark:text-slate-200 leading-normal">{svc.name}</span>
                        <span className="shrink-0 font-black text-slate-900 dark:text-white">{formatVND(svc.price)}</span>
                      </div>
                      {svc.durationMinutes ? (
                        <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1 font-medium">
                          ⏱ Thời lượng: {svc.durationMinutes} phút
                        </span>
                      ) : null}
                      {payMethod === 'cash' && (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 font-bold uppercase tracking-wider">
                          • Cọc giữ lịch {rate * 100}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-4 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-550 dark:text-slate-400 font-semibold">
                  <span>Tạm tính</span>
                  <span>{formatVND(rawTotalPrice)}</span>
                </div>

                {discountAmount > 0 && payMethod === 'payos' && (
                  <div className="flex justify-between text-xs text-rose-500 font-bold">
                    <span>Mã giảm giá (Voucher)</span>
                    <span>-{formatVND(discountAmount)}</span>
                  </div>
                )}
              </div>

              {payMethod === 'cash' ? (
                <div className="bg-amber-500/5 dark:bg-amber-550/10 rounded-2xl p-4 space-y-2 text-xs border border-amber-200/40 dark:border-amber-900/30">
                  <div className="flex justify-between text-amber-800 dark:text-amber-300 font-bold">
                    <span>Tiền cọc cần trả trước (PayOS)</span>
                    <span className="text-sm font-black">{formatVND(depositAmount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-slate-400 border-t border-dashed border-amber-200/40 dark:border-amber-900/30 pt-2 font-medium">
                    <span>Thanh toán tại quầy</span>
                    <span className="font-bold">{formatVND(rawTotalPrice - depositAmount)}</span>
                  </div>
                </div>
              ) : (
                <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Tổng thanh toán</span>
                  <span className="text-xl font-black text-[#1a2b4c] dark:text-teal-400">{formatVND(totalPrice)}</span>
                </div>
              )}

              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3 space-y-2 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-green-500">verified_user</span>
                  Đặt lịch được bảo đảm bởi Peteye
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-blue-500">undo</span>
                  Hủy miễn phí trước 24 giờ
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-amber-500">lock</span>
                  Thanh toán mã hóa SSL 256-bit
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={!agreed || loading}
                className="w-full py-4 bg-[#1a2b4c] text-white font-black rounded-xl hover:bg-[#243d6b] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#1a2b4c]/25 text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang xử lý...
                  </>
                ) : payMethod === 'payos' ? (
                  <>
                    <span className="material-symbols-outlined">qr_code_2</span>
                    Thanh toán qua PayOS
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">qr_code_2</span>
                    Đặt cọc qua PayOS để giữ lịch
                  </>
                )}
              </button>

              {import.meta.env.DEV && (
                <button
                  onClick={async () => {
                    if (!agreed || loading) return;
                    setLoading(true);
                    setError('');
                    const serviceIds = serviceList.map(s => s.id);
                    const summaryData = {
                      shopName: booking.shopName,
                      shopAddress: booking.shopAddress,
                      shopImage: booking.shopImage,
                      services: serviceList,
                      totalPrice: payMethod === 'cash' ? depositAmount : totalPrice,
                      isDeposit: payMethod === 'cash'
                    };
                    localStorage.setItem('pendingBookingSummary', JSON.stringify(summaryData));
                    try {
                      const dataPayload = {
                        shopId: booking.shopId,
                        serviceId: booking.serviceId,
                        serviceIds: serviceIds,
                        petId: booking.petId,
                        staffId: booking.staffId,
                        appointmentDatetime: booking.appointmentDatetime,
                        checkIn: booking.checkIn,
                        checkOut: booking.checkOut,
                        note: bookingNote.trim()
                          ? (booking.petNote ? `${booking.petNote}\n—\nGhi chú thêm: ${bookingNote.trim()}` : bookingNote.trim())
                          : (booking.petNote || ''),
                        paymentMethod: (payMethod === 'cash' ? 'CASH' : 'PAYOS') as "PAYOS" | "CASH",
                        cageSize: booking.cageSize,
                        roomType: booking.roomType,
                        userVoucherId: payMethod === 'payos' && selectedVoucherId ? selectedVoucherId : undefined,
                      };
                      const result = payMethod === 'cash' 
                        ? await bookingService.initiateCashDeposit(dataPayload)
                        : await bookingService.initiatePayment(dataPayload);
                      
                      if (result.orderCode) {
                        const confirmedBooking = payMethod === 'cash'
                          ? await bookingService.mockConfirmCashDeposit(result.orderCode)
                          : await bookingService.mockConfirmPayment(result.orderCode);
                        localStorage.removeItem('pendingBookingSummary');
                        
                        navigate('/booking/success', {
                          state: {
                            booking: confirmedBooking,
                            isCashDeposit: payMethod === 'cash',
                            bookingInfo: {
                              shopId: confirmedBooking.shopId,
                              shopName: confirmedBooking.shopName,
                              shopAddress: confirmedBooking.shopAddress,
                              serviceId: confirmedBooking.serviceId,
                              serviceName: confirmedBooking.serviceName,
                              servicePrice: confirmedBooking.servicePrice,
                              services: summaryData.services,
                              petId: confirmedBooking.petId,
                              petName: confirmedBooking.petName,
                              petNote: confirmedBooking.note,
                              staffId: confirmedBooking.staffId,
                              staffName: confirmedBooking.staffName,
                              appointmentDatetime: confirmedBooking.appointmentDatetime,
                              date: confirmedBooking.checkIn && confirmedBooking.checkOut
                                ? `Lưu trú: ${new Date(confirmedBooking.checkIn).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} → ${new Date(confirmedBooking.checkOut).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
                                : new Date(confirmedBooking.appointmentDatetime).toLocaleDateString('vi-VN', {
                                    weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit'
                                  }),
                              time: confirmedBooking.checkIn && confirmedBooking.checkOut
                                ? `${Math.max(1, Math.round((new Date(confirmedBooking.checkOut).getTime() - new Date(confirmedBooking.checkIn).getTime()) / 86400000))} ngày`
                                : new Date(confirmedBooking.appointmentDatetime).toLocaleTimeString('vi-VN', {
                                    hour: '2-digit', minute: '2-digit'
                                  })
                            }
                          },
                          replace: true
                        });
                      }
                    } catch (e: any) {
                      setError(e?.response?.data?.message || 'Lỗi giả lập thanh toán.');
                      setLoading(false);
                    }
                  }}
                  disabled={!agreed || loading}
                  className="w-full py-4 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-lg text-base flex items-center justify-center gap-2 mt-3"
                >
                  <span className="material-symbols-outlined">bug_report</span>
                  Thanh toán giả lập (Test)
                </button>
              )}

              <button
                onClick={() => navigate(-1)}
                className="w-full py-2.5 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:text-slate-700 transition-colors"
              >
                ← Quay lại
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
