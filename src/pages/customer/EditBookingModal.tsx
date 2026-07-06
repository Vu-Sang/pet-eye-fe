import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, Calendar, Clock, Stethoscope, User, Plus, Loader2 } from 'lucide-react';
import { formatVND } from '../../utils/currency';
import { generateTimeSlots, isTimeInPastOrBuffer } from '../../utils/dateUtils';
import { formatPetWeightLabel } from '../../utils/shopHelper';
import { petService } from '../../services/pet.service';
import { shopService } from '../../services/shop.service';
import { bookingService } from '../../services/booking.service';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { BookingResponse, ServiceResponse } from '../../types/api';
import { motion, AnimatePresence } from 'motion/react';

function matchPetWeight(numericWeight: number, weightTiers?: string[], prices?: number[]): { tier: string; price: number } | null {
  if (!weightTiers || !prices || weightTiers.length === 0 || prices.length === 0) return null;
  
  const thresholds = weightTiers.map(tier => {
    const num = parseFloat(tier.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  });
  
  let idx = 0;
  if (numericWeight >= thresholds[0]) {
    for (let i = 0; i < thresholds.length - 1; i++) {
      if (numericWeight >= thresholds[i]) {
        idx = i + 1;
      }
    }
  }
  
  const price = prices[idx] ?? prices[prices.length - 1];
  const tier = weightTiers[idx];
  
  let friendlyLabel = tier;
  if (thresholds.length >= 2) {
    if (idx === 0) {
      friendlyLabel = `Dưới ${thresholds[0]}kg`;
    } else if (idx === thresholds.length - 1 && numericWeight >= thresholds[idx]) {
      friendlyLabel = `Trên ${thresholds[idx]}kg`;
    } else {
      friendlyLabel = `${thresholds[idx - 1]} - ${thresholds[idx]}kg`;
    }
  }
  
  return { tier: friendlyLabel, price };
}

function isPetCompatibleWithService(petSpecies: string, svcPetType: 'DOG' | 'CAT' | 'OTHER'): boolean {
  const normSpecies = (petSpecies || '').trim().toUpperCase();
  const isDog = normSpecies === 'CHÓ' || normSpecies === 'DOG';
  const isCat = normSpecies === 'MÈO' || normSpecies === 'CAT';

  if (svcPetType === 'DOG' && !isDog) return false;
  if (svcPetType === 'CAT' && !isCat) return false;
  return true;
}

interface EditBookingModalProps {
  booking: BookingResponse;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditBookingModal({ booking, onClose, onSuccess }: EditBookingModalProps) {
  const { user } = useAuth();
  const today = new Date();

  // ----- STATES -----
  const [selectedPetId, setSelectedPetId] = useState<number>(booking.petId);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    booking.services?.map(s => s.serviceId) || (booking.serviceId ? [booking.serviceId] : [])
  );
  
  // Boarding states
  const [isHotelSelected, setIsHotelSelected] = useState(
    booking.services?.some(s => s.category?.toUpperCase() === 'BOARDING' || s.category?.toUpperCase() === 'HOTEL') || false
  );
  const [selectedCageSize, setSelectedCageSize] = useState<string>(booking.petWeight || '');
  const [selectedCageSizeIndex, setSelectedCageSizeIndex] = useState<number>(0);
  const [selectedRoomType, setSelectedRoomType] = useState<string>(booking.roomType || '');
  const [checkInDate, setCheckInDate] = useState(booking.checkIn ? booking.checkIn.substring(0, 10) : today.toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (booking.checkOut) return booking.checkOut.substring(0, 10);
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });

  // Normal service date & time
  const [selectedDate, setSelectedDate] = useState(booking.appointmentDatetime ? booking.appointmentDatetime.substring(0, 10) : today.toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(booking.appointmentDatetime ? booking.appointmentDatetime.substring(11, 16) : null);
  
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(booking.staffId || null);
  const [payDifferenceMethod, setPayDifferenceMethod] = useState<'PAYOS' | 'CASH'>(booking.paymentMethod === 'CASH' ? 'CASH' : 'PAYOS');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ----- QUERIES -----
  // 1. My Pets
  const { data: myPets = [] } = useQuery({
    queryKey: ['my-pets', user?.id],
    queryFn: () => petService.getByOwner(Number(user?.id)),
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: true
  });

  // 2. Shop Services
  const { data: apiServices = [] } = useQuery({
    queryKey: ['shop-services', booking.shopId],
    queryFn: () => shopService.getShopServices(booking.shopId),
  });

  const boardingService = apiServices.find((s: ServiceResponse) => (s.category === 'BOARDING' || s.category.toUpperCase() === 'HOTEL') && s.active);
  const nonBoardingServices = apiServices.filter((s: ServiceResponse) => (s.category !== 'BOARDING' && s.category?.toUpperCase() !== 'HOTEL') && s.active);

  // Auto-sync isHotelSelected when services change
  useEffect(() => {
    if (boardingService && selectedServiceIds.includes(boardingService.id)) {
      setIsHotelSelected(true);
    } else {
      setIsHotelSelected(false);
    }
  }, [selectedServiceIds, boardingService]);

  // Sync boarding weight index
  useEffect(() => {
    if (boardingService) {
      const initialIdx = boardingService.petWeight?.indexOf(selectedCageSize) ?? -1;
      if (initialIdx === -1 && boardingService.petWeight?.length) {
        // Try to match by friendly label
        const matchedIdx = boardingService.petWeight.findIndex((w, idx) => 
          formatPetWeightLabel(w, boardingService.petWeight, idx).toLowerCase().replace(/\s+/g, '') === 
          selectedCageSize.toLowerCase().replace(/\s+/g, '')
        );
        if (matchedIdx !== -1) {
          setSelectedCageSize(boardingService.petWeight[matchedIdx]);
          setSelectedCageSizeIndex(matchedIdx);
        } else {
          setSelectedCageSize(boardingService.petWeight[0]);
          setSelectedCageSizeIndex(0);
        }
      } else {
        setSelectedCageSizeIndex(initialIdx >= 0 ? initialIdx : 0);
      }
    }
  }, [boardingService, selectedCageSize]);

  const toggleService = (svcId: number) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(svcId)) return prev.filter(id => id !== svcId);
      return [...prev, svcId];
    });
  };

  const hasNormalServices = selectedServiceIds.some(id => nonBoardingServices.some((s: ServiceResponse) => s.id === id));
  
  // 3. Staff Availability
  const appointmentDatetimeForQuery = hasNormalServices && selectedDate && selectedTime
    ? `${selectedDate}T${selectedTime}:00`
    : null;
    
  const totalServiceDuration = selectedServiceIds.reduce((sum, id) => {
    const s = apiServices.find((x: ServiceResponse) => x.id === id);
    return sum + (s?.durationMinutes || 0);
  }, 0);

  const primaryServiceDuration = hasNormalServices ? totalServiceDuration : 60;

  const { data: staffData = [] } = useQuery({
    queryKey: ['staff-availability', booking.shopId, appointmentDatetimeForQuery, primaryServiceDuration],
    queryFn: () => bookingService.getShopStaffAvailability(booking.shopId, appointmentDatetimeForQuery!, primaryServiceDuration),
    enabled: !!appointmentDatetimeForQuery,
  });

  const staffWithAvailability = staffData.filter(s => s.role !== 'OWNER' && s.role !== 'MANAGER');
  
  // Generate time slots based on selectedDate
  const generateTimeSlotsForEdit = () => {
    const slots = [];
    const [h, m] = [8, 0];
    const endH = 20;
    let curr = new Date(today);
    curr.setHours(h, m, 0, 0);
    
    while (curr.getHours() < endH) {
      slots.push(curr.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
      curr.setMinutes(curr.getMinutes() + 30);
    }
    return slots;
  };
  
  const allTimeSlots = generateTimeSlotsForEdit();

  // Price calculations
  const boardingDays = isHotelSelected
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    : 0;

  const boardingBasePrice = React.useMemo(() => {
    if (!boardingService) return 0;
    if (boardingService.petWeight?.length && boardingService.prices?.length) {
      const idx = selectedCageSizeIndex;
      if (idx >= 0 && idx < boardingService.prices.length && typeof boardingService.prices[idx] === 'number') {
        return boardingService.prices[idx];
      }
    }
    return boardingService.price ?? 0;
  }, [boardingService, selectedCageSizeIndex]);

  const selectedPet = myPets.find((p: any) => p.id === selectedPetId);

  const newTotalPrice = React.useMemo(() => {
    let total = 0;
    if (hasNormalServices) {
      total += selectedServiceIds.reduce((sum, id) => {
        if (id === boardingService?.id) return sum;
        const s = apiServices.find((x: ServiceResponse) => x.id === id);
        if (!s) return sum;
        let effectivePrice = s.price;
        if (selectedPet?.weight && s.petWeight?.length && s.prices?.length) {
          const matchResult = matchPetWeight(selectedPet.weight, s.petWeight, s.prices);
          if (matchResult) {
            effectivePrice = matchResult.price;
          }
        }
        return sum + (effectivePrice || 0);
      }, 0);
    }
    if (isHotelSelected) {
      total += boardingBasePrice * boardingDays;
    }
    return total;
  }, [hasNormalServices, isHotelSelected, selectedServiceIds, boardingService, apiServices, boardingBasePrice, boardingDays, selectedPet, myPets]);

  const oldTotalPrice = booking.services?.length 
    ? booking.services.reduce((sum, s) => sum + s.servicePrice, 0)
    : booking.servicePrice;

  const alreadyPaid = booking.paidAmount ?? (booking.paymentMethod === 'CASH' ? oldTotalPrice * 0.1 : oldTotalPrice);

  const diffAmount = payDifferenceMethod === 'CASH' 
    ? Math.max(0, (newTotalPrice * 0.1) - alreadyPaid) 
    : Math.max(0, newTotalPrice - alreadyPaid);

  const hasPriceDifference = newTotalPrice !== oldTotalPrice;
  const hasUnpaidBalance = alreadyPaid < newTotalPrice;
  // Assume all slots available unless backend says otherwise. For edit modal simplicity, just use all slots.
  // Real logic would be similar to ClinicDetail.tsx, but simplified here.
  const availableSlots = allTimeSlots;

  // ----- SUBMIT -----
  const handleSubmit = async () => {
    if (!selectedPetId) return toast.error('Vui lòng chọn thú cưng');
    if (selectedServiceIds.length === 0) return toast.error('Vui lòng chọn ít nhất 1 dịch vụ');

    if (selectedPet) {
      const incompatibleServices = selectedServiceIds
        .map(id => apiServices.find((s: ServiceResponse) => s.id === id))
        .filter((svc): svc is ServiceResponse => !!svc)
        .filter(svc => !isPetCompatibleWithService(selectedPet.species, svc.petType));

      if (incompatibleServices.length > 0) {
        const invalidNames = incompatibleServices.map(s => s.serviceName).join(', ');
        return toast.error(`Thú cưng ${selectedPet.name} (${selectedPet.species}) không phù hợp với các dịch vụ đã chọn: ${invalidNames}. Vui lòng chọn bé khác hoặc kiểm tra lại dịch vụ!`);
      }

      if (isHotelSelected && boardingService) {
        if (!isPetCompatibleWithService(selectedPet.species, boardingService.petType)) {
          return toast.error(`Thú cưng ${selectedPet.name} (${selectedPet.species}) không phù hợp với dịch vụ lưu trú đã chọn.`);
        }
      }
    }
    
    if (hasNormalServices) {
      if (!selectedDate || !selectedTime) return toast.error('Vui lòng chọn ngày giờ hẹn cho dịch vụ thường');
    }
    if (isHotelSelected) {
      if (!checkInDate || !checkOutDate) return toast.error('Vui lòng chọn ngày nhận/trả phòng');
      if (checkInDate >= checkOutDate) return toast.error('Ngày trả phòng phải sau ngày nhận phòng');
    }

    try {
      setIsSubmitting(true);
      const primaryServiceId = hasNormalServices ? selectedServiceIds.find(id => id !== boardingService?.id) : boardingService?.id;
      
      let matchedPetWeightOption: string | undefined = undefined;
      if (selectedPet?.weight) {
        for (const id of selectedServiceIds) {
          const s = apiServices.find((x: ServiceResponse) => x.id === id);
          if (s && s.petWeight && s.petWeight.length > 0 && s.prices && s.prices.length > 0) {
            const matchResult = matchPetWeight(selectedPet.weight, s.petWeight, s.prices);
            if (matchResult) {
              matchedPetWeightOption = matchResult.tier;
              break;
            }
          }
        }
      }

      const requestPayload = {
        shopId: booking.shopId,
        serviceId: primaryServiceId,
        serviceIds: selectedServiceIds,
        petId: selectedPetId,
        staffId: selectedStaffId || undefined,
        appointmentDatetime: hasNormalServices ? `${selectedDate}T${selectedTime}:00` : `${checkInDate}T12:00:00`,
        checkIn: isHotelSelected ? checkInDate : undefined,
        checkOut: isHotelSelected ? checkOutDate : undefined,
        note: booking.note,
        petWeight: matchedPetWeightOption || selectedCageSize || undefined,
        cageSize: matchedPetWeightOption || selectedCageSize || undefined,
        roomType: selectedRoomType || undefined,
        paymentMethod: payDifferenceMethod,
      };

      const result = await bookingService.updateBooking(booking.id, requestPayload);
      
      if (result.checkoutUrl) {
        toast.success('Cập nhật thành công! Đang chuyển hướng thanh toán phần chênh lệch...');
        window.location.href = result.checkoutUrl;
      } else {
        toast.success('Đã cập nhật lịch hẹn thành công');
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Cập nhật thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-black text-slate-900 dark:text-white">Chỉnh sửa Lịch hẹn #{booking.id}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* PET SELECTION */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-lg">pets</span>
              </span>
              Chọn Thú Cưng
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {myPets.map(pet => (
                <button
                  key={pet.id}
                  onClick={() => setSelectedPetId(pet.id)}
                  className={`flex items-center gap-3 p-3 min-w-[160px] rounded-2xl border-2 transition-all ${
                    selectedPetId === pet.id ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-200 overflow-hidden shrink-0">
                    <img src={pet.avatar || 'https://via.placeholder.com/150'} alt={pet.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left flex-1 truncate">
                    <p className="text-sm font-bold truncate text-slate-800 dark:text-slate-200">{pet.name}</p>
                    <p className="text-[10px] text-slate-500">{pet.species}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* SERVICE SELECTION */}
          <section>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Stethoscope size={18} />
              </span>
              Chọn Dịch Vụ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {apiServices.map(svc => (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`flex items-center justify-between p-3 rounded-2xl border-2 transition-all text-left ${
                    selectedServiceIds.includes(svc.id) ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{svc.serviceName}</p>
                    <p className="text-xs text-slate-500">{svc.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  {selectedServiceIds.includes(svc.id) && <span className="material-symbols-outlined text-primary">check_circle</span>}
                </button>
              ))}
            </div>
          </section>

          {/* BOARDING CONFIG */}
          {isHotelSelected && boardingService && (
            <section className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-3xl border border-indigo-100 dark:border-indigo-800">
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-200 mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">home</span>
                Chi tiết Lưu trú
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nhận phòng</label>
                  <input
                    type="date"
                    value={checkInDate}
                    min={today.toISOString().split('T')[0]}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Trả phòng</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    min={checkInDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-indigo-200 bg-white text-sm"
                  />
                </div>
              </div>
              
              {/* Cage Size - dynamic mapping */}
              {boardingService.petWeight?.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-2 block">Cân nặng của Pet</label>
                  <div className="flex flex-wrap gap-2">
                    {boardingService.petWeight.map((size: string, idx: number) => {
                      const isSelected = selectedCageSizeIndex === idx;
                      return (
                        <button
                          key={`${size}-${idx}`}
                          onClick={() => {
                            setSelectedCageSizeIndex(idx);
                            setSelectedCageSize(size);
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl border-2 font-bold text-sm min-w-[80px] ${isSelected ? 'border-indigo-500 text-indigo-600 bg-white' : 'border-indigo-200 text-slate-500 bg-transparent'}`}
                        >
                          {formatPetWeightLabel(size, boardingService.petWeight, idx)}
                          {boardingService.prices && boardingService.prices[idx] !== undefined && (
                            <div className="text-[10px] opacity-70 font-normal">
                              {(boardingService.prices[idx] as number).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* NORMAL SERVICE DATE & TIME */}
          {hasNormalServices && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Calendar size={18} />
                </span>
                Ngày & Giờ (Dịch vụ thường)
              </h3>
              <input
                type="date"
                value={selectedDate}
                min={today.toISOString().split('T')[0]}
                onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white font-medium mb-4"
              />
              <div className="grid grid-cols-4 gap-2">
                {allTimeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                      selectedTime === time ? 'bg-primary border-primary text-white' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-primary/30'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* STAFF SELECTION */}
          {hasNormalServices && selectedTime && (
            <section>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <User size={18} />
                </span>
                Nhân viên
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setSelectedStaffId(null)}
                  className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left ${selectedStaffId === null ? 'border-primary bg-primary/5' : 'border-slate-100'}`}
                >
                  <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center"><User size={20} className="text-slate-500" /></div>
                  <div className="flex-1"><p className="text-sm font-bold">Hệ thống phân công (Bất kỳ)</p></div>
                </button>
                {staffWithAvailability.map(s => (
                  <button
                    key={s.id}
                    disabled={s.available === false}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left ${selectedStaffId === s.id ? 'border-primary bg-primary/5' : 'border-slate-100'} ${s.available === false ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center text-white font-bold">{s.fullName.charAt(0)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{s.fullName}</p>
                      <p className="text-xs text-slate-500">{s.available === false ? 'Đang bận' : 'Rảnh'}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          
          {hasUnpaidBalance && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800/50 space-y-4">
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {hasPriceDifference ? "Phát sinh chênh lệch giá" : "Thanh toán số dư"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {hasPriceDifference 
                    ? "Dịch vụ bạn chọn có giá thay đổi. Vui lòng chọn phương thức thanh toán."
                    : "Lịch hẹn này chưa được thanh toán toàn bộ. Bạn có thể thanh toán phần còn lại ngay bây giờ."}
                </p>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className={`flex items-start justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${payDifferenceMethod === 'CASH' ? 'border-yellow-500 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-2">
                    <input type="radio" name="payDiff" checked={payDifferenceMethod === 'CASH'} onChange={() => setPayDifferenceMethod('CASH')} className="w-4 h-4 text-yellow-500 mt-1" />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">Thanh toán tại quầy</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                        Đã thanh toán {alreadyPaid.toLocaleString('vi-VN')}đ, cần đóng thêm cọc online {(Math.max(0, (newTotalPrice * 0.1) - alreadyPaid)).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-yellow-600 dark:text-yellow-500 self-center">{Math.max(0, (newTotalPrice * 0.1) - alreadyPaid).toLocaleString('vi-VN')}đ</span>
                </label>
                
                <label className={`flex items-start justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${payDifferenceMethod === 'PAYOS' ? 'border-yellow-500 bg-white dark:bg-slate-800' : 'border-slate-200 dark:border-slate-700'}`}>
                  <div className="flex items-start gap-2">
                    <input type="radio" name="payDiff" checked={payDifferenceMethod === 'PAYOS'} onChange={() => setPayDifferenceMethod('PAYOS')} className="w-4 h-4 text-yellow-500 mt-1" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Thanh toán toàn bộ (100%)</span>
                      <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                        Tổng {newTotalPrice.toLocaleString('vi-VN')}đ - Đã đóng {alreadyPaid.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                  <span className="font-black text-yellow-600 dark:text-yellow-500 self-center">{Math.max(0, newTotalPrice - alreadyPaid).toLocaleString('vi-VN')}đ</span>
                </label>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-[#1a2b4c] text-white font-black text-lg flex items-center justify-center gap-2 hover:bg-[#243d6b] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" /> : <Clock size={20} />}
            Xác nhận Cập nhật
          </button>
        </div>
      </motion.div>
    </div>
  );
}
