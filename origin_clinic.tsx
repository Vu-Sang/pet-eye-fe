import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shopService } from '../../services/shop.service';
import { petService } from '../../services/pet.service';
import { reviewService } from '../../services/review.service';
import { bookingService } from '../../services/booking.service';
import { clinicService } from '../../services/clinic.service';
import { useAuth } from '../../contexts/AuthContext';
import type { ServiceResponse, StaffResponse } from '../../types/api';
import type { Pet } from '../../types';
import type { DirectionsResponse } from '../../services/clinic.service';
import ShopMap from '../../components/ShopMap';
import { trackBookingStep1_ServiceSelection, trackBookingStep2_TimeSelection, trackBookingStep3_PetSelection, trackUseGpsNearby } from '../../lib/analytics';


// Camera tier metadata ΓÇö default fallbacks (shop can override via cameraTierLabels/cameraTierPrices)
const CAMERA_TIER_META: Record<string, { label: string; desc: string; icon: string; defaultPrice: number }> = {
  BASIC: { label: 'C╞í bß║ún (720p)', desc: 'Gi├ím s├ít ti├¬u chuß║⌐n, ─æ├ú bao gß╗ôm trong g├│i', icon: 'visibility', defaultPrice: 0 },
  HD: { label: 'Sß║»c n├⌐t (1080p HD)', desc: 'H├¼nh ß║únh sß║»c n├⌐t, m├áu sß║»c trung thß╗▒c', icon: 'hd', defaultPrice: 50000 },
  PANORAMIC: { label: 'To├án cß║únh (360┬░)', desc: 'Xoay 360 ─æß╗Ö, kh├┤ng g├│c chß║┐t', icon: 'flip_camera_android', defaultPrice: 100000 },
  AI: { label: 'AI Gi├ím s├ít', desc: 'Cß║únh b├ío tß╗▒ ─æß╗Öng h├ánh vi bß║Ñt th╞░ß╗¥ng', icon: 'psychology', defaultPrice: 150000 },
};

const SPECIALTY_MAP: Record<string, string> = {
  'Grooming': 'L├ám ─æß║╣p & Spa',
  'Vet / Clinic': 'Th├║ y & Ph├▓ng kh├ím',
  'Boarding': 'Kh├ích sß║ín & L╞░u tr├║',
  'General': 'L─⌐nh vß╗▒c chung / Kh├íc'
};

const ROLE_MAP: Record<string, string> = {
  'Groomer': 'Kß╗╣ thuß║¡t vi├¬n Grooming',
  'GROOMER': 'Kß╗╣ thuß║¡t vi├¬n Grooming',
  'Vet': 'B├íc s─⌐ th├║ y',
  'VET': 'B├íc s─⌐ th├║ y',
  'VETERINARIAN': 'B├íc s─⌐ th├║ y',
  'Care': 'Chuy├¬n vi├¬n ch─âm s├│c',
  'CARE': 'Chuy├¬n vi├¬n ch─âm s├│c',
  'Manager': 'Quß║ún l├╜ vß║¡n h├ánh',
  'MANAGER': 'Quß║ún l├╜ vß║¡n h├ánh'
};

/** Resolve effective price for a tier: use shop's custom price if set, else default */
function tierPrice(tierId: string, tierPrices?: Record<string, number>): number {
  if (tierPrices && tierId in tierPrices) return tierPrices[tierId];
  return CAMERA_TIER_META[tierId]?.defaultPrice ?? 0;
}

/** Resolve effective label for a tier: use shop's custom label if set, else default */
function tierLabel(tierId: string, tierLabels?: Record<string, string>): string {
  if (tierLabels && tierLabels[tierId]) return tierLabels[tierId];
  return CAMERA_TIER_META[tierId]?.label ?? tierId;
}

const today = new Date();

function StarRating({ rating, size = 'text-base' }: { rating: number; size?: string }) {
  return (
    <div className={`flex items-center gap-0.5 text-amber-400 ${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
          {star <= Math.floor(rating) ? 'star' : star - rating <= 0.5 ? 'star_half' : 'star_border'}
        </span>
      ))}
    </div>
  );
}

export default function ClinicDetail() {
  const { id } = useParams<{ id: string }>();
  const shopId = Number(id);
  const navigate = useNavigate();
  const location = useLocation();
  const editBooking = location.state?.editBooking;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showFullDesc, setShowFullDesc] = useState(false);

  // ΓöÇΓöÇ Real data from API ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const { data: shop, isLoading: shopLoading } = useQuery({
    queryKey: ['shop-public', shopId],
    queryFn: () => shopService.getPublicById(shopId),
    enabled: !!shopId,
  });

  const { data: apiServices = [], isLoading: servicesLoading } = useQuery({
    queryKey: ['shop-services', shopId],
    queryFn: () => shopService.getShopServices(shopId),
    enabled: !!shopId,
  });

  const { data: apiReviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: ['shop-reviews', shopId],
    queryFn: () => reviewService.getReviewsByShop(shopId),
    enabled: !!shopId,
  });

  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['shop-reviews-count', shopId],
    queryFn: () => reviewService.getReviewCount(shopId),
    enabled: !!shopId,
  });

  // C╞í sß╗ƒ gß║ºn ─æ├óy ΓÇö lß║Ñy shop c├╣ng th├ánh phß╗æ, sort theo rating cao nhß║Ñt
  const { data: nearbyShops = [] } = useQuery({
    queryKey: ['nearby-shops', shop?.city],
    queryFn: () => shopService.searchPublic({ city: shop!.city }),
    enabled: !!shop?.city,
    select: (data) => data
      .filter(s => s.id !== shopId)
      .sort((a, b) => b.ratingAvg - a.ratingAvg)
      .slice(0, 4),
  });

  // ΓöÇΓöÇ Map & Directions state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [directions, setDirections] = useState<DirectionsResponse | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          console.log('Γ£à Got user location:', location);
          setUserLocation(location);
        },
        (error) => {
          console.warn('ΓÜá∩╕Å Geolocation error:', error.message);
          // Fallback: D├╣ng tß╗ìa ─æß╗Ö TP.HCM
          const fallbackLocation = { lat: 10.7769, lng: 106.7009 };
          console.log('Using fallback location (TP.HCM):', fallbackLocation);
          setUserLocation(fallbackLocation);

          // Th├┤ng b├ío cho user
          import('react-hot-toast').then(({ toast }) => {
            toast('Kh├┤ng lß║Ñy ─æ╞░ß╗úc vß╗ï tr├¡ cß╗ºa bß║ín. ─Éang d├╣ng vß╗ï tr├¡ mß║╖c ─æß╗ïnh (TP.HCM)', {
              icon: '≡ƒôì',
              duration: 3000,
            });
          });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    } else {
      console.warn('ΓÜá∩╕Å Geolocation not supported');
      // Fallback: TP.HCM
      const fallbackLocation = { lat: 10.7769, lng: 106.7009 };
      console.log('Using fallback location (TP.HCM):', fallbackLocation);
      setUserLocation(fallbackLocation);
    }
  }, []);

  // Add body scroll lock when modal is open
  useEffect(() => {
    if (showMap) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showMap]);



  // Debug: Log shop coordinates
  useEffect(() => {
    if (shop) {
      console.log('Shop data:', {
        id: shop.id,
        name: shop.shopName,
        latitude: shop.latitude,
        longitude: shop.longitude,
        hasCoordinates: !!(shop.latitude && shop.longitude)
      });
    }
  }, [shop]);

  // Get directions to a shop
  const handleGetDirections = async (targetShopId: number) => {
    if (!userLocation) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Vui l├▓ng bß║¡t ─æß╗ïnh vß╗ï ─æß╗â xem chß╗ë ─æ╞░ß╗¥ng');
      });
      return;
    }

    try {
      const result = await clinicService.getDirectionsToShop(
        targetShopId,
        userLocation.lat,
        userLocation.lng
      );
      trackUseGpsNearby('success');
      setDirections(result);
      setShowMap(true);

      import('react-hot-toast').then(({ toast }) => {
        toast.success('─É├ú t├¼m thß║Ñy ─æ╞░ß╗¥ng ─æi!');
      });
    } catch (error) {
      console.error('Failed to get directions:', error);
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Kh├┤ng thß╗â lß║Ñy chß╗ë ─æ╞░ß╗¥ng. Vui l├▓ng thß╗¡ lß║íi.');
      });
    }
  };

  const { data: myPets = [] } = useQuery({
    queryKey: ['my-pets', user?.id],
    queryFn: () => petService.getByOwner(Number(user?.id)),
    enabled: !!user?.id && !isNaN(Number(user.id)),
  });

  // ΓöÇΓöÇ Booking state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [selectedTime, setSelectedTime] = useState<string | null>(editBooking?.appointmentDatetime ? editBooking.appointmentDatetime.substring(11, 16) : null);
  const [selectedDate, setSelectedDate] = useState(editBooking?.appointmentDatetime ? editBooking.appointmentDatetime.substring(0, 10) : today.toISOString().split('T')[0]);
  // BOARDING: check-in / check-out dates
  const [checkInDate, setCheckInDate] = useState(editBooking?.checkIn ? editBooking.checkIn.substring(0, 10) : today.toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState(() => {
    if (editBooking?.checkOut) return editBooking.checkOut.substring(0, 10);
    const d = new Date(today); d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isFavorited, setIsFavorited] = useState(false);
  const [reviewFilter, setReviewFilter] = useState('Tß║Ñt cß║ú');
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(editBooking ? editBooking.services?.map((s: any) => s.serviceId) || [] : []);
  const [isHotelSelected, setIsHotelSelected] = useState(editBooking?.services?.some((s: any) => s.category?.toUpperCase() === 'BOARDING' || s.category?.toUpperCase() === 'HOTEL') || false);
  const [selectedCameraTier, setSelectedCameraTier] = useState<string>('BASIC');
  const [selectedCageSize, setSelectedCageSize] = useState<string>(editBooking?.cageSize || '');
  const [selectedRoomType, setSelectedRoomType] = useState<string>(editBooking?.roomType || '');

  // Derive all active boarding services from API data
  const boardingServices = useMemo(() => {
    return apiServices.filter((s: ServiceResponse) => (s.category === 'BOARDING' || s.category.toUpperCase() === 'HOTEL') && s.active);
  }, [apiServices]);

  // Selected boarding service state
  const [selectedBoardingServiceId, setSelectedBoardingServiceId] = useState<number | null>(() => {
    const editBoarding = editBooking?.services?.find((s: any) => s.category?.toUpperCase() === 'BOARDING' || s.category?.toUpperCase() === 'HOTEL');
    return editBoarding ? editBoarding.serviceId : null;
  });

  // Default selection when apiServices loaded
  useEffect(() => {
    if (apiServices.length > 0 && !selectedBoardingServiceId) {
      const firstBoarding = apiServices.find((s: ServiceResponse) => (s.category === 'BOARDING' || s.category.toUpperCase() === 'HOTEL') && s.active);
      if (firstBoarding) {
        setSelectedBoardingServiceId(firstBoarding.id);
      }
    }
  }, [apiServices, selectedBoardingServiceId]);

  // Derive the currently selected boarding service
  const boardingService = useMemo(() => {
    if (!selectedBoardingServiceId) return null;
    return apiServices.find((s: ServiceResponse) => s.id === selectedBoardingServiceId && s.active) || null;
  }, [apiServices, selectedBoardingServiceId]);

  // Camera tiers supported by this shop's boarding service
  const supportedCameraTiers = useMemo(() => {
    return boardingService?.cameraTiers ?? [];
  }, [boardingService]);

  // Non-boarding services for "Dß╗ïch vß╗Ñ nß╗òi bß║¡t"
  const nonBoardingServices = useMemo(() => {
    return apiServices.filter((s: ServiceResponse) => s.category !== 'BOARDING' && s.category.toUpperCase() !== 'HOTEL');
  }, [apiServices]);

  // Pagination for featured services
  const [featuredServicesPage, setFeaturedServicesPage] = useState(0);
  const SERVICES_PER_PAGE = 4;
  
  const paginatedFeaturedServices = useMemo(() => {
    const startIndex = featuredServicesPage * SERVICES_PER_PAGE;
    return apiServices.slice(startIndex, startIndex + SERVICES_PER_PAGE);
  }, [apiServices, featuredServicesPage]);

  const totalFeaturedPages = Math.ceil(apiServices.length / SERVICES_PER_PAGE);

  // Pagination for boarding services
  const [boardingServicesPage, setBoardingServicesPage] = useState(0);
  const BOARDING_SERVICES_PER_PAGE = 4;
  
  const paginatedBoardingServices = useMemo(() => {
    const startIndex = boardingServicesPage * BOARDING_SERVICES_PER_PAGE;
    return boardingServices.slice(startIndex, startIndex + BOARDING_SERVICES_PER_PAGE);
  }, [boardingServices, boardingServicesPage]);

  const totalBoardingPages = Math.ceil(boardingServices.length / BOARDING_SERVICES_PER_PAGE);

  useEffect(() => {
    if (boardingService) {
      const validCage = boardingService.cageSize?.includes(selectedCageSize);
      if (!validCage && boardingService.cageSize?.length) {
        setSelectedCageSize(boardingService.cageSize[0]);
      }
      const validRoom = boardingService.roomType?.includes(selectedRoomType);
      if (!validRoom && boardingService.roomType?.length) {
        setSelectedRoomType(boardingService.roomType[0]);
      }
    }
  }, [boardingService, selectedBoardingServiceId]);

  // Number of boarding days
  const boardingDays = isHotelSelected
    ? Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000))
    : 0;

  const boardingBasePrice = useMemo(() => {
    if (!boardingService) return 0;
    if (boardingService.cageSize?.length && boardingService.prices?.length) {
      const idx = boardingService.cageSize.indexOf(selectedCageSize);
      if (idx !== -1 && typeof boardingService.prices[idx] === 'number') {
        return boardingService.prices[idx];
      }
    }
    return boardingService.price ?? 0;
  }, [boardingService, selectedCageSize]);

  const roomTypeExtraPrice = useMemo(() => {
    if (!boardingService || !selectedRoomType || !boardingService.roomTypePrices) return 0;
    return boardingService.roomTypePrices[selectedRoomType] || 0;
  }, [boardingService, selectedRoomType]);

  const cageSizeExtraPrice = useMemo(() => {
    if (!boardingService) return 0;
    const base = boardingService.price ?? 0;
    return boardingBasePrice > base ? boardingBasePrice - base : 0;
  }, [boardingService, boardingBasePrice]);

  // ΓöÇΓöÇ Staff selection ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [selectedStaff, setSelectedStaff] = useState<StaffResponse | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(editBooking?.staffId || null);
  const [staffAvailabilityLoading, setStaffAvailabilityLoading] = useState(false);
  const [staffWithAvailability, setStaffWithAvailability] = useState<StaffResponse[]>([]);
  const [staffAvailabilityError, setStaffAvailabilityError] = useState(false);

  // Tß╗òng duration cß╗ºa tß║Ñt cß║ú services ─æ├ú chß╗ìn ΓÇö d├╣ng ─æß╗â check conflict
  const totalServiceDuration = useMemo(() => {
    if (selectedServiceIds.length === 0) return 60;
    return selectedServiceIds.reduce((sum, id) => {
      const svc = apiServices.find((s: ServiceResponse) => s.id === id);
      return sum + (svc?.durationMinutes ?? 0);
    }, 0) || 60;
  }, [selectedServiceIds, apiServices]);

  // primaryServiceDuration: duration service ─æß║ºu ti├¬n (d├╣ng cho staff availability check)
  const primaryServiceDuration = useMemo(() => {
    if (selectedServiceIds.length > 0) {
      const svc = apiServices.find((s: ServiceResponse) => s.id === selectedServiceIds[0]);
      return svc?.durationMinutes ?? 60;
    }
    return 60;
  }, [selectedServiceIds, apiServices]);

  // ΓöÇΓöÇ Derived booleans ΓÇö khai b├ío sß╗¢m ─æß╗â d├╣ng trong useEffects b├¬n d╞░ß╗¢i ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const hasNormalServices = selectedServiceIds.length > 0;

  // ΓöÇΓöÇ Available time slots (from API) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // availableSlots: mß║úng "HH:mm" cß╗ºa c├íc slot c├▓n nh├ón vi├¬n rß║únh (tß╗½ BE)
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Tß║Ñt cß║ú slots cß╗ºa shop trong ng├áy ΓÇö b╞░ß╗¢c cß╗æ ─æß╗ïnh 60 ph├║t ─æß╗â UI ─æß║╣p
  // Slot n├áo kh├┤ng c├│ trong availableSlots th├¼ disabled
  const allTimeSlots = useMemo(() => {
    if (!hasNormalServices) return [];
    const openStr = shop?.openTime ?? '08:00';
    const closeStr = shop?.closeTime ?? '20:00';
    const parseTime = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const openMin = parseTime(openStr);
    const closeMin = parseTime(closeStr);
    const STEP = 60; // b╞░ß╗¢c cß╗æ ─æß╗ïnh 60 ph├║t
    const slots: string[] = [];

    const now = new Date();
    // Assuming selectedDate is "YYYY-MM-DD"
    // Use local timezone for "today" to match selectedDate
    const todayStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const isToday = selectedDate === todayStr;
    const currentMin = now.getHours() * 60 + now.getMinutes();

    // Sinh ─æß║┐n khi slot + totalDuration vß║½n c├▓n trong giß╗¥ ─æ├│ng cß╗¡a
    for (let m = openMin; m + totalServiceDuration <= closeMin; m += STEP) {
      if (isToday && m <= currentMin) continue; // Filter out past times for today
      const hh = String(Math.floor(m / 60)).padStart(2, '0');
      const mm = String(m % 60).padStart(2, '0');
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }, [shop?.openTime, shop?.closeTime, totalServiceDuration, hasNormalServices, selectedDate]);

  // Fetch available slots mß╗ùi khi date hoß║╖c services thay ─æß╗òi
  useEffect(() => {
    if (!shopId || !selectedDate || !hasNormalServices) {
      setAvailableSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    bookingService
      .getAvailableTimeSlotsForServices(shopId, selectedDate, selectedServiceIds)
      .then((slots) => {
        if (cancelled) return;
        // BE trß║ú vß╗ü ISO datetime "2026-05-19T08:00:00", extract "HH:mm"
        const times = slots.map((s) => s.substring(11, 16));
        setAvailableSlots(times);
        // Nß║┐u slot ─æang chß╗ìn kh├┤ng c├▓n available ΓåÆ reset
        setSelectedTime((prev) => (prev && !times.includes(prev) ? null : prev));
      })
      .catch(() => {
        if (!cancelled) setAvailableSlots([]);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => { cancelled = true; };
  }, [shopId, selectedDate, selectedServiceIds, hasNormalServices]);

  // ΓöÇΓöÇ Pet selection modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [showPetModal, setShowPetModal] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [petNote, setPetNote] = useState('');
  const [selectedServiceForDetail, setSelectedServiceForDetail] = useState<ServiceResponse | null>(null);
  const [checkingPet, setCheckingPet] = useState(false);

  // ΓöÇΓöÇ Quick Add Pet inline ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const [showQuickAddPet, setShowQuickAddPet] = useState(false);
  const [quickPetSubmitting, setQuickPetSubmitting] = useState(false);
  const [quickPetForm, setQuickPetForm] = useState({
    name: '',
    species: 'Ch├│' as string,
    breed: '',
    weight: '',
  });

  const handleQuickAddPet = async () => {
    if (!quickPetForm.name.trim() || !quickPetForm.weight) return;
    setQuickPetSubmitting(true);
    try {
      const payload = {
        name: quickPetForm.name.trim(),
        species: quickPetForm.species,
        breed: quickPetForm.breed.trim() || 'Ch╞░a r├╡',
        gender: '─Éß╗▒c',
        color: '',
        sterilized: false,
        weight: Number(quickPetForm.weight) || 0,
        dob: '',
        healthNote: '',
        ownerId: Number(user?.id),
        avatar: quickPetForm.species === 'M├¿o'
          ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2043&auto=format&fit=crop'
          : 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=2069&auto=format&fit=crop',
        nutritionPlan: [],
        medicalRecords: [],
        vaccinations: [],
        reminders: [],
        initialDocuments: [],
        album: [],
      };
      const newPet = await petService.create(payload);
      // Refresh danh s├ích pet
      await queryClient.invalidateQueries({ queryKey: ['my-pets', user?.id] });
      // Tß╗▒ chß╗ìn pet vß╗½a tß║ío
      setSelectedPet(newPet);
      setShowQuickAddPet(false);
      setQuickPetForm({ name: '', species: 'Ch├│', breed: '', weight: '' });
      // Th├┤ng b├ío nhß║»c bß╗ò sung th├┤ng tin
      import('react-hot-toast').then(({ toast }) => {
        toast.success(`─É├ú th├¬m b├⌐ ${newPet.name}! Bß║ín c├│ thß╗â bß╗ò sung th├┤ng tin chi tiß║┐t sau tß║íi mß╗Ñc "Th├║ c╞░ng cß╗ºa t├┤i".`, {
          duration: 5000,
          icon: '≡ƒÉ╛',
        });
      });
    } catch (error: any) {
      import('react-hot-toast').then(({ toast }) => {
        toast.error(error.message || 'Lß╗ùi khi th├¬m th├║ c╞░ng. Vui l├▓ng thß╗¡ lß║íi.');
      });
    } finally {
      setQuickPetSubmitting(false);
    }
  };

  // Availability map: petId ΓåÆ true (available) | false (busy) | undefined (loading)
  const [petAvailabilityMap, setPetAvailabilityMap] = useState<Record<number, boolean>>({});
  const [loadingPetAvailability, setLoadingPetAvailability] = useState(false);
  // Pet ─æang xem lß╗ïch hß║╣n
  const [viewingBookingsPetId, setViewingBookingsPetId] = useState<number | null>(null);
  const [petBookings, setPetBookings] = useState<any[]>([]);
  const [loadingPetBookings, setLoadingPetBookings] = useState(false);

  // Khi modal mß╗ƒ: check availability tß║Ñt cß║ú pets
  useEffect(() => {
    if (!showPetModal) return;
    const activePets = (myPets as any[]).filter((p: any) => p.active);
    if (activePets.length === 0) return;

    const appointmentDatetime = hasNormalServices && selectedDate && selectedTime
      ? `${selectedDate}T${selectedTime}:00`
      : checkInDate ? `${checkInDate}T12:00:00` : null;

    if (!appointmentDatetime) return;

    const durationForCheck = isHotelSelected ? boardingDays * 24 * 60 : totalServiceDuration;

    setLoadingPetAvailability(true);
    Promise.all(
      activePets.map((pet: any) =>
        bookingService.checkPetAvailability(pet.id, appointmentDatetime, durationForCheck)
          .then(available => ({ id: pet.id, available }))
          .catch(() => ({ id: pet.id, available: true })) // fallback: cho ph├⌐p chß╗ìn nß║┐u lß╗ùi
      )
    ).then(results => {
      const map: Record<number, boolean> = {};
      results.forEach(r => { map[r.id] = r.available; });
      setPetAvailabilityMap(map);
      setLoadingPetAvailability(false);
    });
  }, [showPetModal]);

  const toggleService = (serviceId: number) => {
    const svc = apiServices.find((s: ServiceResponse) => s.id === serviceId);
    if (svc && (svc.category === 'BOARDING' || svc.category.toUpperCase() === 'HOTEL')) {
      if (isHotelSelected && selectedBoardingServiceId === serviceId) {
        setIsHotelSelected(false);
      } else {
        setSelectedBoardingServiceId(serviceId);
        setIsHotelSelected(true);
      }
      return;
    }

    trackBookingStep1_ServiceSelection(
      shopId,
      shop?.shopName || '',
      [...selectedServiceIds, serviceId].map(id => apiServices.find((s: ServiceResponse) => s.id === id)?.serviceName || '')
    );
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
    // Reset time khi thay ─æß╗òi services (tß╗òng duration thay ─æß╗òi ΓåÆ slots thay ─æß╗òi)
    setSelectedTime(null);
    setAvailableSlots([]);
  };

  const cameraTierExtraPrice = isHotelSelected
    ? tierPrice(selectedCameraTier, boardingService?.cameraTierPrices)
    : 0;

  const totalPrice = selectedServiceIds.reduce((sum, id) => {
    const svc = apiServices.find((s: ServiceResponse) => s.id === id);
    return sum + (svc ? svc.price : 0);
  }, 0) + (isHotelSelected
    ? (boardingBasePrice + cameraTierExtraPrice + roomTypeExtraPrice) * boardingDays
    : 0);

  // ΓöÇΓöÇ Can book ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  // - Boarding only: cß║ºn checkIn + checkOut v├á kh├┤ng tr├╣ng ng├áy nghß╗ë
  // - Dß╗ïch vß╗Ñ th╞░ß╗¥ng only: cß║ºn ├¡t nhß║Ñt 1 service + date + time v├á kh├┤ng tr├╣ng ng├áy nghß╗ë
  // - Cß║ú 2: cß║ºn ─æß╗º cß║ú boarding dates V├Ç date+time cho dß╗ïch vß╗Ñ th╞░ß╗¥ng
  const isSelectedDateOff = shop?.offDays ? shop.offDays.split(',').includes(selectedDate) : false;
  const isCheckInOff = shop?.offDays ? shop.offDays.split(',').includes(checkInDate) : false;
  const isCheckOutOff = shop?.offDays ? shop.offDays.split(',').includes(checkOutDate) : false;

  const boardingReady = isHotelSelected ? (!!checkInDate && !!checkOutDate && checkInDate < checkOutDate && !isCheckInOff && !isCheckOutOff) : true;
  const normalReady = hasNormalServices ? (!!selectedDate && !!selectedTime && !isSelectedDateOff) : true;

  // Fetch staff availability whenever date+time changes (for normal services)
  const appointmentDatetimeForQuery = hasNormalServices && selectedDate && selectedTime
    ? `${selectedDate}T${selectedTime}:00`
    : null;

  useEffect(() => {
    if (!appointmentDatetimeForQuery || !shopId) {
      setStaffWithAvailability([]);
      setStaffAvailabilityError(false);
      return;
    }
    let cancelled = false;
    setStaffAvailabilityLoading(true);
    setStaffAvailabilityError(false);
    bookingService
      .getShopStaffAvailability(shopId, appointmentDatetimeForQuery, primaryServiceDuration)
      .then((data) => {
        if (!cancelled) setStaffWithAvailability(data);
      })
      .catch(() => {
        if (!cancelled) {
          setStaffAvailabilityError(true);
          // Fallback: load staff without availability info
          bookingService.getShopStaff(shopId).then((data) => {
            if (!cancelled) setStaffWithAvailability(
              data.map(s => ({ ...s, available: true }))
            );
          }).catch(() => {
            if (!cancelled) setStaffWithAvailability([]);
          });
        }
      })
      .finally(() => {
        if (!cancelled) setStaffAvailabilityLoading(false);
      });
    return () => { cancelled = true; };
  }, [appointmentDatetimeForQuery, shopId, primaryServiceDuration]);

  // When selected staff is busy, find available alternatives
  const selectedStaffBusy = selectedStaffId !== null
    && staffWithAvailability.length > 0
    && staffWithAvailability.find(s => s.id === selectedStaffId)?.available === false;

  const suggestedStaff = selectedStaffBusy
    ? staffWithAvailability.filter(s => s.available === true).slice(0, 3)
    : [];
  const canBook = (isHotelSelected || hasNormalServices) && boardingReady && normalReady;

  function handleBookClick() {
    if (!canBook) return;

    trackBookingStep2_TimeSelection(
      shopId,
      shop?.shopName || '',
      selectedStaffId ? staffWithAvailability.find(s => s.id === selectedStaffId)?.fullName || 'T├╣y chß╗ìn' : 'T├╣y chß╗ìn',
      selectedDate,
      selectedTime || ''
    );

    const now = new Date();
    if (hasNormalServices && selectedDate && selectedTime) {
      const selectedDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      if (selectedDateTime <= now) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Thß╗¥i gian n├áy ─æ├ú qua. Vui l├▓ng chß╗ìn mß╗Öt khung giß╗¥ kh├íc trong t╞░╞íng lai.');
        });
        return;
      }
    } else if (isHotelSelected && checkInDate) {
      const checkInDateTime = new Date(`${checkInDate}T12:00:00`);
      if (checkInDateTime <= now) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Ng├áy l╞░u tr├║ ─æ├ú qua. Vui l├▓ng chß╗ìn lß║íi ng├áy nhß║¡n ph├▓ng.');
        });
        return;
      }
    }

    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setShowPetModal(true);
  }

  // ΓöÇΓöÇ After pet selected ΓåÆ go to payment page with state ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  async function handleConfirmPet() {
    if (!selectedPet) return;

    trackBookingStep3_PetSelection(
      shopId,
      shop?.shopName || '',
      selectedPet.name
    );

    // appointmentDatetime:
    // - Nß║┐u c├│ dß╗ïch vß╗Ñ th╞░ß╗¥ng ΓåÆ d├╣ng date+time cß╗ºa dß╗ïch vß╗Ñ th╞░ß╗¥ng (BE validate @Future)
    // - Nß║┐u chß╗ë c├│ boarding ΓåÆ d├╣ng check-in date l├║c 12:00
    const appointmentDatetime = hasNormalServices
      ? `${selectedDate}T${selectedTime}:00`
      : `${checkInDate}T12:00:00`;

    const durationForCheck = isHotelSelected ? boardingDays * 24 * 60 : totalServiceDuration;

    setCheckingPet(true);
    try {
      const isAvailable = await bookingService.checkPetAvailability(selectedPet.id, appointmentDatetime, durationForCheck);
      if (!isAvailable) {
        import('react-hot-toast').then(({ toast }) => {
          toast.error('Th├║ c╞░ng n├áy ─æ├ú c├│ lß╗ïch hß║╣n trong khoß║úng thß╗¥i gian n├áy. Vui l├▓ng chß╗ìn b├⌐ kh├íc hoß║╖c thß╗¥i gian kh├íc.');
        });
        setCheckingPet(false);
        return;
      }
    } catch (error) {
      console.error(error);
      import('react-hot-toast').then(({ toast }) => {
        toast.error('Lß╗ùi kiß╗âm tra lß╗ïch trß╗æng cß╗ºa th├║ c╞░ng. Vui l├▓ng thß╗¡ lß║íi.');
      });
      setCheckingPet(false);
      return;
    }
    setCheckingPet(false);
    setShowPetModal(false);

    // Tß║¡p hß╗úp tß║Ñt cß║ú services ─æ├ú chß╗ìn (th╞░ß╗¥ng + boarding)
    const selectedServices = selectedServiceIds.map((id) => {
      const svc = apiServices.find((s: ServiceResponse) => s.id === id)!;
      return { id: svc.id, name: svc.serviceName, price: svc.price, durationMinutes: svc.durationMinutes, category: svc.category, cameraEnabled: svc.cameraEnabled };
    });

    if (isHotelSelected && boardingService) {
      const boardingPrice = (boardingBasePrice + cameraTierExtraPrice + roomTypeExtraPrice) * boardingDays;
      const roomTypeLabel = selectedRoomType ? ` ┬╖ ${selectedRoomType}` : '';
      selectedServices.unshift({
        id: boardingService.id,
        name: `${boardingService.serviceName} ┬╖ Camera ${tierLabel(selectedCameraTier, boardingService.cameraTierLabels)}${roomTypeLabel} ┬╖ ${boardingDays} ng├áy`,
        price: boardingPrice,
        durationMinutes: undefined,
        category: boardingService.category,
        cameraEnabled: boardingService.cameraEnabled,
      });
    }

    // serviceId ch├¡nh ─æß╗â gß╗¡i l├¬n BE:
    // - Nß║┐u c├│ dß╗ïch vß╗Ñ th╞░ß╗¥ng ΓåÆ d├╣ng service th╞░ß╗¥ng ─æß║ºu ti├¬n (c├│ datetime cß╗Ñ thß╗â)
    // - Nß║┐u chß╗ë c├│ boarding ΓåÆ d├╣ng boardingService
    const primaryServiceId = hasNormalServices
      ? selectedServiceIds[0]
      : boardingService?.id;

    const totalServicePrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

    navigate('/payment', {
      state: {
        updateBookingId: editBooking?.id,
        shopId,
        shopName: shop?.shopName,
        shopAddress: shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '',
        shopImage: shop?.logoUrl || shop?.licenseImageUrl,
        serviceId: primaryServiceId,
        // Danh s├ích ─æß║ºy ─æß╗º ─æß╗â hiß╗ân thß╗ï tr├¬n Payment
        services: selectedServices,
        // Giß╗» lß║íi ─æß╗â t╞░╞íng th├¡ch ng╞░ß╗úc
        serviceName: selectedServices.map(s => s.name).join(', '),
        servicePrice: totalServicePrice,
        petId: selectedPet.id,
        petName: `${selectedPet.name} (${selectedPet.species})`,
        petNote: petNote || undefined,
        staffId: selectedStaffId ?? undefined,
        staffName: selectedStaffId
          ? staffWithAvailability.find(s => s.id === selectedStaffId)?.fullName
          : undefined,
        appointmentDatetime,
        checkIn: isHotelSelected ? `${checkInDate}T12:00:00` : undefined,
        checkOut: isHotelSelected ? `${checkOutDate}T12:00:00` : undefined,
        date: (() => {
          const parts: string[] = [];
          if (hasNormalServices && selectedDate && selectedTime) {
            // Format: "Thß╗⌐ Ba, 19/05/2026"
            parts.push(new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString('vi-VN', {
              weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric'
            }));
          }
          if (isHotelSelected) {
            // Format: "L╞░u tr├║: 04/05/2026 ΓåÆ 05/05/2026"
            parts.push(`L╞░u tr├║: ${new Date(checkInDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} ΓåÆ ${new Date(checkOutDate + 'T00:00:00').toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`);
          }
          return parts.join(' | ');
        })(),
        // time: giß╗¥ hß║╣n dß╗ïch vß╗Ñ th╞░ß╗¥ng, hoß║╖c "X ng├áy" nß║┐u chß╗ë c├│ boarding
        time: hasNormalServices ? selectedTime! : `${boardingDays} ng├áy`,
        // Truyß╗ün th├¬m ─æß╗â BookingSuccess hiß╗ân thß╗ï ─æ├║ng
        normalServiceNames: hasNormalServices
          ? selectedServiceIds.map(id => apiServices.find((s: ServiceResponse) => s.id === id)?.serviceName).filter(Boolean).join(', ')
          : undefined,
        cageSize: isHotelSelected ? selectedCageSize : undefined,
        roomType: isHotelSelected ? selectedRoomType : undefined,
      }
    });
  }

  // Derive gallery images from banner and galleryUrls
  const galleryImages = React.useMemo(() => {
    const images = [];
    if (shop?.bannerUrl) images.push(shop.bannerUrl);
    if (shop?.galleryUrls) {
      images.push(...shop.galleryUrls.split(',').filter(Boolean));
    }

    // If shop has no images at all, show 1 placeholder
    if (images.length === 0) {
      images.push('https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80');
    }

    return images;
  }, [shop?.bannerUrl, shop?.galleryUrls]);

  const dayName = today.toLocaleDateString('vi-VN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

  if (shopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1a2b4c]" />
      </div>
    );
  }

  const handleShare = async () => {
    const shareData = {
      title: shop?.shopName || 'Peteye',
      text: `Kh├ím ph├í ${shop?.shopName} tr├¬n Peteye - Nß╗ün tß║úng ch─âm s├│c th├║ c╞░ng h├áng ─æß║ºu.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        import('react-hot-toast').then(({ toast }) => {
          toast.success('─É├ú sao ch├⌐p li├¬n kß║┐t v├áo bß╗Ö nhß╗¢ tß║ím!');
        });
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-900 pt-24 sm:pt-32 lg:pt-36">

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-28 lg:pb-6 relative">
        <div className="flex flex-col lg:block">
          {/* Clinic Header */}
          <div className="order-2 lg:order-none flex flex-wrap justify-between items-start gap-4 pb-5 mt-5 lg:mt-0">
            <div className="flex flex-col gap-2">
              <h1 className="text-slate-900 dark:text-slate-100 text-xl sm:text-2xl md:text-4xl font-black leading-tight tracking-tight">
              {shop?.shopName ?? '─Éang tß║úi...'}
            </h1>
            {shop?.shopType && (
              <div className="flex flex-wrap gap-2">
                {shop.shopType === 'MIXED' ? (
                  <>
                    <span className="px-2.5 py-1 bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-md text-[11px] sm:text-[12px] font-medium border border-purple-100 dark:border-purple-500/20">
                      Spa & Grooming
                    </span>
                    <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md text-[11px] sm:text-[12px] font-medium border border-blue-100 dark:border-blue-500/20">
                      Th├║ y
                    </span>
                    <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded-md text-[11px] sm:text-[12px] font-medium border border-orange-100 dark:border-orange-500/20">
                      Kh├ích sß║ín
                    </span>
                  </>
                ) : (
                  <span className={`px-2.5 py-1 rounded-md text-[11px] sm:text-[12px] font-medium border ${
                    (shop.shopType === 'GROOMING' || shop.shopType === 'SPA') ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-500/20' : 
                    shop.shopType === 'CLINIC' ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20' : 
                    (shop.shopType === 'HOTEL' || shop.shopType === 'BOARDING') ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-500/20' : 
                    'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}>
                    {(shop.shopType === 'GROOMING' || shop.shopType === 'SPA') ? 'Spa & Grooming' : 
                     shop.shopType === 'CLINIC' ? 'Ph├▓ng kh├ím th├║ y' : 
                     (shop.shopType === 'HOTEL' || shop.shopType === 'BOARDING') ? 'Kh├ích sß║ín th├║ c╞░ng' : 
                     shop.shopType}
                  </span>
                )}
                
                {/* Camera Badge */}
                {apiServices?.some((s: any) => s.cameraEnabled) && (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-md text-[11px] sm:text-[12px] font-bold border border-red-100 dark:border-red-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                    </span>
                    Live Camera
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
              {shop?.ratingAvg ? (
                <>
                  <span className="flex items-center text-amber-500 gap-1">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    {shop.ratingAvg.toFixed(1)}
                  </span>
                  <span>ΓÇó</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:flex items-center text-amber-500 gap-1">
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                    Mß╗¢i
                  </span>
                  <span className="hidden sm:inline">ΓÇó</span>
                </>
              )}
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-teal-500">location_on</span>
                {shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '---'}
              </span>
              {shop?.isVerified && (
                <span className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold text-xs">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  ─Éß╗æi t├íc x├íc minh
                </span>
              )}
            </div>
          </div>
        </div>

          {/* Mobile Hero Slider (Only on < lg) */}
          <div className="order-1 lg:hidden w-full h-[240px] sm:h-[320px] flex overflow-x-auto snap-x snap-mandatory hide-scrollbar rounded-2xl shadow-sm mb-5">
            {galleryImages.map((img, i) => (
              <div
                key={i}
                className="w-full h-full flex-none snap-center bg-center bg-no-repeat bg-cover relative"
                style={{ backgroundImage: `url(${img})` }}
              >
                <div className="absolute inset-0 bg-black/5" />
                {galleryImages.length > 1 && (
                  <div className="absolute bottom-3 right-3 bg-black/50 text-white px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                    {i + 1} / {galleryImages.length}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Hero Image Grid (Only on >= lg) */}
          <div className={`hidden lg:order-none w-full h-[460px] gap-2 overflow-hidden rounded-2xl mb-8 ${galleryImages.length === 1 ? 'lg:flex' :
            galleryImages.length === 2 ? 'lg:grid lg:grid-cols-2' :
              galleryImages.length === 3 ? 'lg:grid lg:grid-cols-3' :
                galleryImages.length === 4 ? 'lg:grid lg:grid-cols-3 lg:grid-rows-2' :
                  'lg:grid lg:grid-cols-4 lg:grid-rows-2'
            }`}>
          {/* Layout for 1 image */}
          {galleryImages.length === 1 && (
            <div
              className="w-full h-full bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
              style={{ backgroundImage: `url(${galleryImages[0]})` }}
            >
              <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
            </div>
          )}

          {/* Layout for 2 images */}
          {galleryImages.length === 2 && galleryImages.map((img, i) => (
            <div
              key={i}
              className="w-full h-full bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
              style={{ backgroundImage: `url(${img})` }}
            >
              <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
            </div>
          ))}

          {/* Layout for 3 images */}
          {galleryImages.length === 3 && (
            <>
              <div
                className="col-span-2 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              <div className="col-span-1 flex flex-col gap-2">
                {galleryImages.slice(1, 3).map((img, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                    style={{ backgroundImage: `url(${img})` }}
                  >
                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Layout for 4 images */}
          {galleryImages.length === 4 && (
            <>
              <div
                className="col-span-2 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              <div className="col-span-1 row-span-2 flex flex-col gap-2">
                {galleryImages.slice(1, 3).map((img, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                    style={{ backgroundImage: `url(${img})` }}
                  >
                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                  </div>
                ))}
              </div>
              <div
                className="col-span-1 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[3]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
            </>
          )}

          {/* Layout for 5+ images */}
          {galleryImages.length >= 5 && (
            <>
              <div
                className="col-span-2 row-span-2 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[0]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
              </div>
              {galleryImages.slice(1, 4).map((img, i) => (
                <div
                  key={i}
                  className="col-span-1 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                  style={{ backgroundImage: `url(${img})` }}
                >
                  <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                </div>
              ))}
              <div
                className="col-span-1 row-span-1 bg-center bg-no-repeat bg-cover hover:brightness-95 transition-all cursor-pointer relative"
                style={{ backgroundImage: `url(${galleryImages[4]})` }}
              >
                <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors" />
                {galleryImages.length > 5 && (
                  <button className="absolute bottom-3 right-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform">
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                    Xem tß║Ñt cß║ú ß║únh
                  </button>
                )}
              </div>
            </>
          )}
        </div>
        </div>

        {/* Map & Directions Section - ─É├ú chuyß╗ân xuß╗æng dß║íng Modal ß╗ƒ cuß╗æi file */}

        {/* Main 2-column layout */}
        <div className="flex flex-col lg:grid lg:grid-cols-[2fr_1fr] gap-10">
          {/* Left Column */}
          <div className="flex flex-col gap-10 min-w-0 order-1 lg:col-start-1 lg:row-start-1">


            {/* Intro */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Giß╗¢i thiß╗çu</h2>
              <div className="relative">
                <p className={`text-slate-600 dark:text-slate-300 leading-relaxed text-base transition-all duration-300 ${
                  !showFullDesc ? 'line-clamp-3 lg:line-clamp-none' : ''
                }`}>
                  {shop?.description ?? '─Éang tß║úi th├┤ng tin...'}
                </p>
                {shop?.description && shop.description.length > 200 && (
                  <div className="lg:hidden mt-2">
                    <button
                      onClick={() => setShowFullDesc(!showFullDesc)}
                      className="text-xs font-black text-[#1a2b4c] dark:text-teal-400 hover:underline flex items-center gap-1 uppercase tracking-wider"
                    >
                      <span>{showFullDesc ? 'Thu gß╗ìn' : 'Xem th├¬m'}</span>
                      <span className="material-symbols-outlined text-sm font-bold">
                        {showFullDesc ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </section>
            {/* Pet Hotel & Camera Options ΓÇö chß╗ë hiß╗ân thß╗ï nß║┐u shop c├│ dß╗ïch vß╗Ñ BOARDING (bß║ún Desktop) */}
            {boardingServices.length > 0 && (
              <div className="hidden lg:block">
                <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">Dß╗ïch vß╗Ñ L╞░u tr├║ & Camera</h2>
                  <div className="flex flex-col gap-4 mb-5">
                    {paginatedBoardingServices.map((item: ServiceResponse) => {
                      const isCurrentSelected = isHotelSelected && selectedBoardingServiceId === item.id;
                      const isThisSelected = selectedBoardingServiceId === item.id;
                      const itemBasePrice = isThisSelected ? boardingBasePrice : (item.price ?? 0);
                      const itemRoomExtra = isThisSelected ? roomTypeExtraPrice : 0;
                      const itemCageExtra = isThisSelected ? cageSizeExtraPrice : 0;
                      return (
                        <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isCurrentSelected ? 'bg-indigo-50/30 border-indigo-100 dark:bg-indigo-950/15 dark:border-indigo-900/50' : 'bg-slate-50 dark:bg-slate-800/20 border-transparent hover:border-slate-200 dark:hover:border-slate-700'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800 shrink-0">
                              <span className="material-symbols-outlined text-2xl">hotel</span>
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.serviceName}</h2>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{(itemBasePrice + itemRoomExtra).toLocaleString('vi-VN')}─æ</span>
                                <span className="text-xs text-slate-400">/ng├áy</span>
                              </div>
                              {isThisSelected && (itemCageExtra > 0 || itemRoomExtra > 0) && (
                                <div className="flex flex-col items-end mt-0.5 gap-0.5">
                                  {itemCageExtra > 0 && (
                                    <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                      + {itemCageExtra.toLocaleString('vi-VN')}─æ (chuß╗ông {selectedCageSize})
                                    </span>
                                  )}
                                  {itemRoomExtra > 0 && (
                                    <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                      + {itemRoomExtra.toLocaleString('vi-VN')}─æ (ph├▓ng {selectedRoomType})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div
                              onClick={() => {
                                if (isHotelSelected && selectedBoardingServiceId === item.id) {
                                  setIsHotelSelected(false);
                                } else {
                                  setSelectedBoardingServiceId(item.id);
                                  setIsHotelSelected(true);
                                }
                              }}
                              className={`relative w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ml-2 ${isCurrentSelected ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isCurrentSelected ? 'left-7 shadow-sm' : 'left-1'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for Boarding Services */}
                  {totalBoardingPages > 1 && (
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBoardingServicesPage(prev => Math.max(0, prev - 1))}
                          disabled={boardingServicesPage === 0}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Tr╞░ß╗¢c
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalBoardingPages }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setBoardingServicesPage(i)}
                              className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                boardingServicesPage === i
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setBoardingServicesPage(prev => Math.min(totalBoardingPages - 1, prev + 1))}
                          disabled={boardingServicesPage >= totalBoardingPages - 1}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Sau
                        </button>
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {boardingServicesPage * BOARDING_SERVICES_PER_PAGE + 1}-{Math.min((boardingServicesPage + 1) * BOARDING_SERVICES_PER_PAGE, boardingServices.length)} cß╗ºa {boardingServices.length}
                      </span>
                    </div>
                  )}

                  <div className={`transition-all duration-500 overflow-hidden ${isHotelSelected && boardingService ? 'max-h-[1200px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    {boardingService && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm overflow-hidden mb-6">
                    {/* Service image + description */}
                    <div className="p-5 flex flex-col sm:flex-row gap-5">
                      {/* Image */}
                      <div className="w-full sm:w-48 h-40 rounded-xl overflow-hidden shadow-md shrink-0 bg-slate-100 dark:bg-slate-700">
                        <img
                          src={boardingService.imageUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80'}
                          className="w-full h-full object-cover"
                          alt={boardingService.serviceName}
                        />
                      </div>

                      {/* Description as feature list ΓÇö d├╣ng cameraDescription nß║┐u c├│, fallback sang description chung */}
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">{boardingService.serviceName}</h4>
                        {(() => {
                          const descText = boardingService.cameraEnabled && boardingService.cameraDescription
                            ? boardingService.cameraDescription
                            : boardingService.description;
                          return descText ? (
                            <div className="flex flex-col gap-1.5">
                              {descText.split(/[,;.\n]/).filter((s: string) => s.trim().length > 5).map((feature: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  <span>{feature.trim()}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}

                        {/* Additional Boarding info (Cage, Room) */}
                        {(boardingService.roomType?.length > 0 || boardingService.cageSize?.length > 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                            {boardingService.roomType?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Loß║íi ph├▓ng</span>
                                {boardingService.roomType.length > 1 ? (
                                  <select
                                    value={selectedRoomType}
                                    onChange={(e) => setSelectedRoomType(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.roomType.map((r: string) => {
                                      return (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      );
                                    })}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {boardingService.roomType[0]}
                                  </span>
                                )}
                              </div>
                            )}
                            {boardingService.cageSize?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">K├¡ch th╞░ß╗¢c chuß╗ông</span>
                                {boardingService.cageSize.length > 1 ? (
                                  <select
                                    value={selectedCageSize}
                                    onChange={(e) => setSelectedCageSize(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.cageSize.map((c: string) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{boardingService.cageSize[0]}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Camera tiers ΓÇö only if shop configured camera */}
                    {boardingService.cameraEnabled && supportedCameraTiers.length > 0 && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 border-t border-indigo-100 dark:border-indigo-900 mt-5">
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-4">
                          N├óng cß║Ñp Camera Gi├ím s├ít
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {supportedCameraTiers.map((tierId: string) => {
                            const meta = CAMERA_TIER_META[tierId];
                            if (!meta) return null;
                            const isSelected = selectedCameraTier === tierId;
                            const effectiveLabel = tierLabel(tierId, boardingService?.cameraTierLabels);
                            const effectivePrice = tierPrice(tierId, boardingService?.cameraTierPrices);
                            return (
                              <div
                                key={tierId}
                                onClick={() => setSelectedCameraTier(tierId)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected
                                  ? 'bg-white dark:bg-indigo-900/40 border-indigo-500 shadow-md'
                                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}>
                                    <span className="material-symbols-outlined text-xl">{meta.icon}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{effectiveLabel}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{meta.desc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${effectivePrice === 0 ? 'text-teal-600' : 'text-slate-900 dark:text-white'}`}>
                                    {effectivePrice === 0 ? 'MIß╗äN PH├ì' : `+${effectivePrice.toLocaleString()}─æ`}
                                  </p>
                                  {effectivePrice > 0 && <p className="text-[8px] text-slate-400">/ng├áy</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </section>
              </div>
            )} {/* end BOARDING conditional (Desktop) */}

            

            {/* Featured Services */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">Dß╗ïch vß╗Ñ nß╗òi bß║¡t</h2>

              {servicesLoading && (
                <div className="flex flex-col gap-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-xl" />
                  ))}
                </div>
              )}

              {!servicesLoading && apiServices.length === 0 && (
                <p className="text-slate-400 text-sm py-4">C╞í sß╗ƒ n├áy ch╞░a c├│ dß╗ïch vß╗Ñ n├áo.</p>
              )}

              {!servicesLoading && apiServices.length > 0 && (
                <div>
                  <div className="flex flex-col gap-3">
                    {paginatedFeaturedServices.map((svc: ServiceResponse) => {
                      return (
                        <div key={svc.id}>
                          <div
                            className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 transition-colors group border border-transparent"
                          >
                            {/* Service Image */}
                            <div className="relative w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-sm bg-slate-200 dark:bg-slate-700">
                              {svc.imageUrl ? (
                                <img
                                  src={svc.imageUrl}
                                  alt={svc.serviceName}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="material-symbols-outlined text-slate-400 text-2xl">pets</span>
                                </div>
                              )}
                            </div>

                            {/* Service Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-[#1a2b4c] dark:group-hover:text-teal-400 transition-colors">
                                {svc.serviceName}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                {svc.description}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                                  ΓÅ▒ {svc.durationMinutes} ph├║t
                                </span>
                                <span className="text-slate-300 dark:text-slate-600">ΓÇó</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setSelectedServiceForDetail(svc); }}
                                  className="text-xs text-[#1a2b4c] dark:text-teal-400 hover:underline flex items-center gap-1"
                                >
                                  <span className="material-symbols-outlined text-xs">info</span>
                                  Chi tiß║┐t
                                </button>
                              </div>
                            </div>

                            {/* Price */}
                            <div className="text-right shrink-0 flex flex-col items-end gap-2">
                              <div className="flex items-baseline gap-1">
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                  {svc.price.toLocaleString('vi-VN')}─æ
                                </span>
                                <span className="text-xs text-slate-400">
                                  {svc.category === 'BOARDING' || svc.category.toUpperCase() === 'HOTEL' ? '/ng├áy' : '/lß║ºn'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls */}
                  {totalFeaturedPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFeaturedServicesPage(prev => Math.max(0, prev - 1))}
                          disabled={featuredServicesPage === 0}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Tr╞░ß╗¢c
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalFeaturedPages }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setFeaturedServicesPage(i)}
                              className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                featuredServicesPage === i
                                  ? 'bg-[#1a2b4c] dark:bg-teal-500 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setFeaturedServicesPage(prev => Math.min(totalFeaturedPages - 1, prev + 1))}
                          disabled={featuredServicesPage >= totalFeaturedPages - 1}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Sau
                        </button>
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {featuredServicesPage * SERVICES_PER_PAGE + 1}-{Math.min((featuredServicesPage + 1) * SERVICES_PER_PAGE, apiServices.length)} cß╗ºa {apiServices.length}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </section>



            {/* Doctors */}
            <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">─Éß╗Öi ng┼⌐ Nh├ón vi├¬n</h2>
                <button className="text-[#1a2b4c] dark:text-teal-400 font-semibold text-sm hover:underline">
                  Xem tß║Ñt cß║ú
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(shop?.staffs || []).length > 0 ? (
                  shop?.staffs?.map((staff: any) => (
                    <div
                      key={staff.id}
                      onClick={() => setSelectedStaff(staff)}
                      className="flex flex-col gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={staff.avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop'}
                          alt={staff.fullName}
                          className="size-16 rounded-full object-cover shrink-0 border-2 border-slate-100 dark:border-slate-700 group-hover:border-teal-400 transition-colors"
                        />
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#1a2b4c] dark:group-hover:text-teal-400 transition-colors">
                            {staff.fullName}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">{ROLE_MAP[staff.role] || staff.role}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">{SPECIALTY_MAP[staff.specialization] || staff.specialization}</p>
                        </div>
                      </div>

                      {/* Certificates Section */}
                      {staff.certificates && staff.certificates.filter((c: any) => c.status === 'VERIFIED').length > 0 && (
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Chß╗⌐ng chß╗ë chuy├¬n m├┤n</p>
                          <div className="flex flex-wrap gap-2">
                            {staff.certificates.filter((c: any) => c.status === 'VERIFIED').map((cert: any) => (
                              <div key={cert.id} className="flex items-center gap-1.5 px-2 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 rounded border border-teal-100 dark:border-teal-800/50">
                                <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                <span className="text-[10px] font-bold capitalize">{cert.certificateName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">Ch╞░a c├│ th├┤ng tin nh├ón vi├¬n.</p>
                )}
              </div>
            </section>
            {/* Pet Hotel & Camera Options ΓÇö chß╗ë hiß╗ân thß╗ï nß║┐u shop c├│ dß╗ïch vß╗Ñ BOARDING (bß║ún Mobile) */}
            {boardingServices.length > 0 && (
              <div className="block lg:hidden">
                <section className="border-b border-slate-200 dark:border-slate-800 pb-8">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 mb-5">Dß╗ïch vß╗Ñ L╞░u tr├║ & Camera</h2>
                  <div className="flex flex-col gap-4 mb-5">
                    {paginatedBoardingServices.map((item: ServiceResponse) => {
                      const isCurrentSelected = isHotelSelected && selectedBoardingServiceId === item.id;
                      const isThisSelected = selectedBoardingServiceId === item.id;
                      const itemBasePrice = isThisSelected ? boardingBasePrice : (item.price ?? 0);
                      const itemRoomExtra = isThisSelected ? roomTypeExtraPrice : 0;
                      const itemCageExtra = isThisSelected ? cageSizeExtraPrice : 0;
                      return (
                        <div key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isCurrentSelected ? 'bg-indigo-50/30 border-indigo-100 dark:bg-indigo-950/15 dark:border-indigo-900/50' : 'bg-slate-50 dark:bg-slate-800/20 border-transparent'}`}>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-800 shrink-0">
                              <span className="material-symbols-outlined text-2xl">hotel</span>
                            </div>
                            <div>
                              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{item.serviceName}</h2>
                              <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">{item.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{(itemBasePrice + itemRoomExtra).toLocaleString('vi-VN')}─æ</span>
                                <span className="text-xs text-slate-400">/ng├áy</span>
                              </div>
                              {isThisSelected && (itemCageExtra > 0 || itemRoomExtra > 0) && (
                                <div className="flex flex-col items-end mt-0.5 gap-0.5">
                                  {itemCageExtra > 0 && (
                                    <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                      + {itemCageExtra.toLocaleString('vi-VN')}─æ (chuß╗ông {selectedCageSize})
                                    </span>
                                  )}
                                  {itemRoomExtra > 0 && (
                                    <span className="text-[10px] text-indigo-500 font-medium bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded">
                                      + {itemRoomExtra.toLocaleString('vi-VN')}─æ (ph├▓ng {selectedRoomType})
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div
                              onClick={() => {
                                if (isHotelSelected && selectedBoardingServiceId === item.id) {
                                  setIsHotelSelected(false);
                                } else {
                                  setSelectedBoardingServiceId(item.id);
                                  setIsHotelSelected(true);
                                }
                              }}
                              className={`relative w-12 h-6 rounded-full cursor-pointer transition-all duration-300 ml-2 ${isCurrentSelected ? 'bg-indigo-600 shadow-inner' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${isCurrentSelected ? 'left-7 shadow-sm' : 'left-1'}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination Controls for Boarding Services */}
                  {totalBoardingPages > 1 && (
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setBoardingServicesPage(prev => Math.max(0, prev - 1))}
                          disabled={boardingServicesPage === 0}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Tr╞░ß╗¢c
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: totalBoardingPages }, (_, i) => (
                            <button
                              key={i}
                              onClick={() => setBoardingServicesPage(i)}
                              className={`w-8 h-8 text-xs font-medium rounded-lg transition-colors ${
                                boardingServicesPage === i
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                              }`}
                            >
                              {i + 1}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => setBoardingServicesPage(prev => Math.min(totalBoardingPages - 1, prev + 1))}
                          disabled={boardingServicesPage >= totalBoardingPages - 1}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Sau
                        </button>
                      </div>

                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {boardingServicesPage * BOARDING_SERVICES_PER_PAGE + 1}-{Math.min((boardingServicesPage + 1) * BOARDING_SERVICES_PER_PAGE, boardingServices.length)} cß╗ºa {boardingServices.length}
                      </span>
                    </div>
                  )}

                  <div className={`transition-all duration-500 overflow-hidden ${isHotelSelected && boardingService ? 'max-h-[1200px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
                    {boardingService && (
                      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm overflow-hidden mb-6">
                    {/* Service image + description */}
                    <div className="p-5 flex flex-col sm:flex-row gap-5">
                      {/* Image */}
                      <div className="w-full sm:w-48 h-40 rounded-xl overflow-hidden shadow-md shrink-0 bg-slate-100 dark:bg-slate-700">
                        <img
                          src={boardingService.imageUrl || 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80'}
                          className="w-full h-full object-cover"
                          alt={boardingService.serviceName}
                        />
                      </div>

                      {/* Description as feature list ΓÇö d├╣ng cameraDescription nß║┐u c├│, fallback sang description chung */}
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base mb-2">{boardingService.serviceName}</h4>
                        {(() => {
                          const descText = boardingService.cameraEnabled && boardingService.cameraDescription
                            ? boardingService.cameraDescription
                            : boardingService.description;
                          return descText ? (
                            <div className="flex flex-col gap-1.5">
                              {descText.split(/[,;.\n]/).filter((s: string) => s.trim().length > 5).map((feature: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                                  <span className="material-symbols-outlined text-indigo-500 text-base mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  <span>{feature.trim()}</span>
                                </div>
                              ))}
                            </div>
                          ) : null;
                        })()}

                        {/* Additional Boarding info (Cage, Room) */}
                        {(boardingService.roomType?.length > 0 || boardingService.cageSize?.length > 0) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 border-t border-slate-100 dark:border-slate-700/50 pt-4">
                            {boardingService.roomType?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">Loß║íi ph├▓ng</span>
                                {boardingService.roomType.length > 1 ? (
                                  <select
                                    value={selectedRoomType}
                                    onChange={(e) => setSelectedRoomType(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.roomType.map((r: string) => {
                                      return (
                                        <option key={r} value={r}>
                                          {r}
                                        </option>
                                      );
                                    })}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {boardingService.roomType[0]}
                                  </span>
                                )}
                              </div>
                            )}
                            {boardingService.cageSize?.length > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black uppercase text-slate-400 mb-1">K├¡ch th╞░ß╗¢c chuß╗ông</span>
                                {boardingService.cageSize.length > 1 ? (
                                  <select
                                    value={selectedCageSize}
                                    onChange={(e) => setSelectedCageSize(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-[#1a2b4c] outline-none"
                                  >
                                    {boardingService.cageSize.map((c: string) => (
                                      <option key={c} value={c}>{c}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{boardingService.cageSize[0]}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Camera tiers ΓÇö only if shop configured camera */}
                    {boardingService.cameraEnabled && supportedCameraTiers.length > 0 && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-5 border-t border-indigo-100 dark:border-indigo-900 mt-5">
                        <h4 className="text-sm font-bold text-indigo-900 dark:text-indigo-400 uppercase tracking-wider mb-4">
                          N├óng cß║Ñp Camera Gi├ím s├ít
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {supportedCameraTiers.map((tierId: string) => {
                            const meta = CAMERA_TIER_META[tierId];
                            if (!meta) return null;
                            const isSelected = selectedCameraTier === tierId;
                            const effectiveLabel = tierLabel(tierId, boardingService?.cameraTierLabels);
                            const effectivePrice = tierPrice(tierId, boardingService?.cameraTierPrices);
                            return (
                              <div
                                key={tierId}
                                onClick={() => setSelectedCameraTier(tierId)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected
                                  ? 'bg-white dark:bg-indigo-900/40 border-indigo-500 shadow-md'
                                  : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-200'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500'}`}>
                                    <span className="material-symbols-outlined text-xl">{meta.icon}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{effectiveLabel}</p>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{meta.desc}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${effectivePrice === 0 ? 'text-teal-600' : 'text-slate-900 dark:text-white'}`}>
                                    {effectivePrice === 0 ? 'MIß╗äN PH├ì' : `+${effectivePrice.toLocaleString()}─æ`}
                                  </p>
                                  {effectivePrice > 0 && <p className="text-[8px] text-slate-400">/ng├áy</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </div>
              </section>
              </div>
            )} {/* end BOARDING conditional (Mobile) */}

            


          </div>

          {/* Reviews */}
          <div className="order-3 lg:col-start-1 lg:row-start-2 min-w-0 w-full">
            <section>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-5">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  ─É├ính gi├í tß╗½ cß╗Öng ─æß╗ông
                  <span className="text-slate-400 font-normal text-sm sm:text-base">({reviewCount})</span>
                </h2>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100">{shop?.ratingAvg ? shop.ratingAvg.toFixed(1) : '0.0'}</span>
                    <div className="flex text-amber-400 justify-center mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: s <= (shop?.ratingAvg || 0) ? "'FILL' 1" : "'FILL' 0" }}>
                          star
                        </span>
                      ))}
                    </div>
                  </div>
                  <select className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm px-3 py-2 text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]">
                    <option>Mß╗¢i nhß║Ñt</option>
                    <option>Cao nhß║Ñt</option>
                    <option>Thß║Ñp nhß║Ñt</option>
                  </select>
                </div>
              </div>

              {/* Filter tags */}
              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
                {['Tß║Ñt cß║ú', '5 sao', '4 sao', '3 sao', '2 sao', '1 sao', 'C├│ h├¼nh ß║únh'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setReviewFilter(f)}
                    className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border text-[11px] sm:text-sm font-medium transition-colors ${reviewFilter === f
                      ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] dark:bg-teal-500 dark:border-teal-500'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Review list */}
              <div className="flex flex-col gap-4 sm:gap-6">
                {(() => {
                  let filteredList = [...(apiReviews || [])];
                  if (reviewFilter === '5 sao') filteredList = filteredList.filter(r => r.rating === 5);
                  else if (reviewFilter === '4 sao') filteredList = filteredList.filter(r => r.rating === 4);
                  else if (reviewFilter === '3 sao') filteredList = filteredList.filter(r => r.rating === 3);
                  else if (reviewFilter === '2 sao') filteredList = filteredList.filter(r => r.rating === 2);
                  else if (reviewFilter === '1 sao') filteredList = filteredList.filter(r => r.rating === 1);
                  else if (reviewFilter === 'C├│ h├¼nh ß║únh') filteredList = filteredList.filter((r: any) => r.images?.length > 0);
                  
                  return filteredList.length > 0 ? (
                    filteredList.map((review: any) => (
                    <div
                      key={review.id}
                      className="flex gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-100 dark:border-slate-800 last:border-0"
                    >
                      <img
                        src={review.userAvatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop'}
                        alt={review.userName}
                        className="size-8 sm:size-10 rounded-full object-cover shrink-0"
                      />
                      <div className="flex flex-col gap-2 flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">{review.userName}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                              </span>
                              {review.serviceName && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-700">ΓÇó</span>
                                  <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                    {review.serviceName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span
                                key={s}
                                className="material-symbols-outlined text-sm"
                                style={{ fontVariationSettings: s <= review.rating ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{review.comment}</p>

                        {review.reply && (
                          <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border-l-4 border-[#1a2b4c] relative overflow-hidden">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-black text-[#1a2b4c] uppercase tracking-widest flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-xs">reply</span>
                                Phß║ún hß╗ôi tß╗½ chß╗º shop
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(review.repliedAt).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                            <p className="text-slate-700 dark:text-slate-200 text-sm italic leading-relaxed">
                              "{review.reply}"
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400 text-sm italic">Ch╞░a c├│ ─æ├ính gi├í n├áo cho c╞í sß╗ƒ n├áy.</p>
                );
                })()}
              </div>

              <div className="text-center mt-6">
                <button className="px-6 py-2.5 rounded-full border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-100 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Xem th├¬m {reviewCount} ─æ├ính gi├í
                </button>
              </div>
            </section>

          </div>

          {/* Right Column - Sidebar (Booking & Map) */}
          <div id="booking-section" className="flex flex-col gap-6 scroll-mt-24 order-2 lg:col-start-2 lg:row-span-2">
            <div className="lg:sticky lg:top-24 flex flex-col gap-6">
              {/* Booking Card */}
              <div className="flex flex-col rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden">
                <div className="p-4 sm:p-6 flex flex-col gap-4 sm:gap-5">

                  {/* ΓöÇΓöÇ Chß╗ìn Dß╗ïch vß╗Ñ (Sidebar) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                  {apiServices.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0 block">
                        Chß╗ìn Dß╗ïch vß╗Ñ
                      </label>
                      <div className="flex flex-col gap-2">
                        {nonBoardingServices.map((svc: ServiceResponse) => {
                          const isSelected = selectedServiceIds.includes(svc.id);
                          return (
                            <div
                              key={svc.id}
                              onClick={() => toggleService(svc.id)}
                              className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                ? 'bg-[#1a2b4c]/5 border-[#1a2b4c]/30 dark:bg-teal-900/20 dark:border-teal-500/50'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/30'
                                }`}
                            >
                              <div className="flex flex-col">
                                <span className={`text-sm font-bold ${isSelected ? 'text-[#1a2b4c] dark:text-teal-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                  {svc.serviceName}
                                </span>
                                <span className="text-xs text-slate-500">{svc.price.toLocaleString('vi-VN')}─æ ΓÇó {svc.durationMinutes} ph├║t</span>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${isSelected
                                ? 'bg-[#1a2b4c] border-[#1a2b4c] dark:bg-teal-500 dark:border-teal-500'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                }`}>
                                {isSelected && (
                                  <span className="material-symbols-outlined text-white text-[13px]" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Summary row */}
                  <AnimatePresence>
                    {(selectedServiceIds.length > 0 || isHotelSelected) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div className="p-4 bg-[#1a2b4c]/5 dark:bg-slate-800 rounded-xl border border-[#1a2b4c]/10 dark:border-slate-700">
                          <div className="flex justify-between items-center text-xs text-slate-500 mb-2 font-bold uppercase tracking-wider">
                            <span>Dß╗ïch vß╗Ñ ─æ├ú chß╗ìn</span>
                            <span className="bg-[#1a2b4c] text-white px-2 py-0.5 rounded-full">{selectedServiceIds.length + (isHotelSelected ? 1 : 0)}</span>
                          </div>

                          {/* Detailed selected services list */}
                          <div className="flex flex-col gap-2 my-3 max-h-48 overflow-y-auto pr-1">
                            {isHotelSelected && boardingService && (
                              <div className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950/50 shadow-sm rounded-xl">
                                <div className="flex flex-col min-w-0">
                                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                                    {boardingService.serviceName}
                                  </span>
                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                                    {selectedCageSize} ΓÇó {selectedRoomType}
                                    {selectedCameraTier !== 'BASIC' && ` ΓÇó Camera ${tierLabel(selectedCameraTier, boardingService.cameraTierLabels)}`}
                                    {` (${boardingDays} ng├áy)`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                    {((boardingBasePrice + cameraTierExtraPrice + roomTypeExtraPrice) * boardingDays).toLocaleString('vi-VN')}─æ
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsHotelSelected(false);
                                    }}
                                    className="text-slate-400 hover:text-red-500 transition-colors p-0.5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                    title="X├│a dß╗ïch vß╗Ñ l╞░u tr├║"
                                  >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {selectedServiceIds.map((id) => {
                              const svc = apiServices.find((s: ServiceResponse) => s.id === id);
                              if (!svc) return null;
                              return (
                                <div key={svc.id} className="flex items-center justify-between gap-3 p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm rounded-xl">
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs truncate">
                                      {svc.serviceName}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                      Thß╗¥i gian: {svc.durationMinutes} ph├║t
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="font-bold text-teal-600 dark:text-teal-400 text-xs">
                                      {svc.price.toLocaleString('vi-VN')}─æ
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleService(svc.id);
                                      }}
                                      className="text-slate-400 hover:text-red-500 transition-colors p-0.5 flex items-center justify-center rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                                      title="X├│a dß╗ïch vß╗Ñ"
                                    >
                                      <span className="material-symbols-outlined text-[14px]">close</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Hiß╗ân thß╗ï tß╗òng thß╗¥i gian nß║┐u c├│ dß╗ïch vß╗Ñ th╞░ß╗¥ng */}
                          {selectedServiceIds.length > 0 && (
                            <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 mb-2">
                              <span className="flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Tß╗òng thß╗¥i gian:
                              </span>
                              <span className="font-bold">{totalServiceDuration} ph├║t</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center pt-2 border-t border-[#1a2b4c]/10 dark:border-slate-700">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">Tß╗òng cß╗Öng:</span>
                            <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                              {totalPrice.toLocaleString('vi-VN')}─æ
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Date / Check-in-out ΓÇö hiß╗ân thß╗ï theo loß║íi dß╗ïch vß╗Ñ ─æ├ú chß╗ìn */}

                  {/* Boarding: check-in / check-out */}
                  {isHotelSelected && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-0 block">
                        L╞░u tr├║ ΓÇö Ng├áy nhß║¡n & trß║ú ph├▓ng
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Nhß║¡n ph├▓ng</label>
                          <input
                            type="date"
                            min={today.toISOString().split('T')[0]}
                            value={checkInDate}
                            onChange={e => {
                              setCheckInDate(e.target.value);
                              if (e.target.value >= checkOutDate) {
                                const d = new Date(e.target.value + 'T00:00:00');
                                d.setDate(d.getDate() + 1);
                                setCheckOutDate(d.toISOString().split('T')[0]);
                              }
                            }}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border ${isCheckInOff ? 'border-red-500 focus:ring-red-500' : 'border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500'} rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1`}
                          />
                          {isCheckInOff && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              Shop nghß╗ë ng├áy n├áy
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-400 mb-1 block">Trß║ú ph├▓ng</label>
                          <input
                            type="date"
                            min={(() => { const d = new Date(checkInDate + 'T00:00:00'); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                            value={checkOutDate}
                            onChange={e => setCheckOutDate(e.target.value)}
                            className={`w-full bg-slate-50 dark:bg-slate-800 border ${isCheckOutOff ? 'border-red-500 focus:ring-red-500' : 'border-indigo-200 dark:border-indigo-700 focus:ring-indigo-500'} rounded-xl px-3 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1`}
                          />
                          {isCheckOutOff && (
                            <p className="text-red-500 text-[10px] mt-1 font-semibold flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">error</span>
                              Shop nghß╗ë ng├áy n├áy
                            </p>
                          )}
                        </div>
                      </div>
                      {boardingDays > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-sm">
                          <span className="text-indigo-700 dark:text-indigo-300 font-semibold">Tß╗òng thß╗¥i gian:</span>
                          <span className="font-black text-indigo-900 dark:text-indigo-200">{boardingDays} ng├áy</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dß╗ïch vß╗Ñ th╞░ß╗¥ng: date + time slots ΓÇö Lu├┤n hiß╗ân thß╗ï, disabled khi ch╞░a chß╗ìn */}
                  {!isHotelSelected && (
                    <div className={`flex flex-col gap-5 transition-opacity duration-300 ${hasNormalServices ? 'opacity-100' : 'opacity-40 pointer-events-none select-none'}`}>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                          Ng├áy hß║╣n
                        </label>
                        <input
                          type="date"
                          min={today.toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                          disabled={!hasNormalServices}
                          className={`w-full bg-slate-50 dark:bg-slate-800 border ${isSelectedDateOff ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]`}
                        />
                        {isSelectedDateOff && (
                          <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            Shop tß║ím nghß╗ë ng├áy n├áy, h├úy chß╗ìn ng├áy kh├íc.
                          </p>
                        )}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Khung giß╗¥
                          </span>
                          <span className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold">
                            {selectedDate
                              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
                              : `${dayName}, ${dateStr}`}
                          </span>
                        </div>

                        <div className="relative min-h-[220px] transition-all duration-300">
                          {slotsLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg">
                              <span className="w-5 h-5 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-500 font-semibold">─Éang cß║¡p nhß║¡t...</span>
                            </div>
                          )}
                          {allTimeSlots.length === 0 ? (
                            <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                              <span className="material-symbols-outlined text-slate-300 text-3xl block mb-2">schedule</span>
                              <p className="text-xs text-slate-400 font-medium">
                                {hasNormalServices ? '─Éang tß║úi khung giß╗¥...' : 'Chß╗ìn dß╗ïch vß╗Ñ ─æß╗â xem khung giß╗¥'}
                              </p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {allTimeSlots.map((time) => {
                                const isAvailable = availableSlots.includes(time);
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    disabled={!isAvailable}
                                    onClick={() => isAvailable && setSelectedTime(time)}
                                    title={!isAvailable ? 'Kh├┤ng c├▓n nh├ón vi├¬n rß║únh trong khung giß╗¥ n├áy' : undefined}
                                    className={`py-2 text-xs font-semibold rounded border transition-all relative ${isSelected
                                      ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-md dark:bg-teal-500 dark:border-teal-500'
                                      : isAvailable
                                        ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400 cursor-pointer'
                                        : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                                      }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Ch├║ th├¡ch */}
                        {allTimeSlots.length > 0 && (
                          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 inline-block" />
                              <span className="text-[10px] text-slate-400">C├▓n trß╗æng</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
                              <span className="text-[10px] text-slate-400">Hß║┐t nh├ón vi├¬n</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Khi c├│ hotel v├á c├│ dß╗ïch vß╗Ñ th╞░ß╗¥ng ΓåÆ vß║½n hiß╗çn date+time */}
                  {isHotelSelected && hasNormalServices && (
                    <>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 block">
                          Dß╗ïch vß╗Ñ th╞░ß╗¥ng ΓÇö Ng├áy hß║╣n
                        </label>
                        <input
                          type="date"
                          min={today.toISOString().split('T')[0]}
                          value={selectedDate}
                          onChange={e => { setSelectedDate(e.target.value); setSelectedTime(null); }}
                          className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#1a2b4c]"
                        />
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                            Khung giß╗¥
                          </span>
                          <span className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold">
                            {selectedDate
                              ? new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" })
                              : `${dayName}, ${dateStr}`}
                          </span>
                        </div>

                        <div className="relative min-h-[220px]">
                          {slotsLoading && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-50/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-lg">
                              <span className="w-5 h-5 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin" />
                              <span className="text-[10px] text-slate-500 font-semibold">─Éang cß║¡p nhß║¡t...</span>
                            </div>
                          )}
                          {allTimeSlots.length === 0 ? (
                            <div className="py-8 text-center flex flex-col items-center justify-center h-full">
                              <span className="material-symbols-outlined text-slate-300 text-3xl block mb-2">schedule</span>
                              <p className="text-xs text-slate-400 font-medium">Chß╗ìn dß╗ïch vß╗Ñ ─æß╗â xem khung giß╗¥</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {allTimeSlots.map((time) => {
                                const isAvailable = availableSlots.includes(time);
                                const isSelected = selectedTime === time;
                                return (
                                  <button
                                    key={time}
                                    disabled={!isAvailable}
                                    onClick={() => isAvailable && setSelectedTime(time)}
                                    title={!isAvailable ? 'Kh├┤ng c├▓n nh├ón vi├¬n rß║únh trong khung giß╗¥ n├áy' : undefined}
                                    className={`py-2 text-xs font-semibold rounded border transition-all relative ${isSelected
                                      ? 'bg-[#1a2b4c] text-white border-[#1a2b4c] shadow-md dark:bg-teal-500 dark:border-teal-500'
                                      : isAvailable
                                        ? 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-500 text-slate-700 dark:text-slate-200 hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400 cursor-pointer'
                                        : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600 cursor-not-allowed line-through'
                                      }`}
                                  >
                                    {time}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Ch├║ th├¡ch */}
                        {allTimeSlots.length > 0 && (
                          <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-white border border-slate-300 inline-block" />
                              <span className="text-[10px] text-slate-400">C├▓n trß╗æng</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-sm bg-slate-100 border border-slate-200 inline-block" />
                              <span className="text-[10px] text-slate-400">Hß║┐t nh├ón vi├¬n</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ΓöÇΓöÇ Staff Selection / Auto Assignment Info ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
                  <AnimatePresence>
                    {hasNormalServices && selectedDate && selectedTime && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {(!shop?.assignmentMode || shop.assignmentMode === 'MANUAL') ? (
                          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                Chß╗ìn nh├ón vi├¬n
                              </label>
                              {selectedStaffId && (
                                <button
                                  onClick={() => setSelectedStaffId(null)}
                                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold transition-colors"
                                >
                                  Bß╗Å chß╗ìn
                                </button>
                              )}
                            </div>

                            {staffAvailabilityLoading ? (
                              <div className="flex items-center gap-2 py-3 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                <span className="w-4 h-4 border-2 border-slate-300 border-t-[#1a2b4c] rounded-full animate-spin shrink-0" />
                                <span className="text-xs text-slate-400">─Éang kiß╗âm tra lß╗ïch nh├ón vi├¬n...</span>
                              </div>
                            ) : staffWithAvailability.length === 0 ? (
                              <div className="py-3 px-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 text-center text-xs text-slate-400">
                                Kh├┤ng c├│ nh├ón vi├¬n n├áo
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {/* "Bß║Ñt kß╗│ nh├ón vi├¬n" option */}
                                <button
                                  onClick={() => setSelectedStaffId(null)}
                                  className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${selectedStaffId === null
                                    ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-slate-400 text-lg">groups</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Bß║Ñt kß╗│ nh├ón vi├¬n</p>
                                    <p className="text-[10px] text-slate-400">Hß╗ç thß╗æng tß╗▒ ph├ón c├┤ng</p>
                                  </div>
                                  {selectedStaffId === null && (
                                    <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 text-base shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                  )}
                                </button>

                                {/* Staff list */}
                                {staffWithAvailability.map((staff) => {
                                  const isSelected = selectedStaffId === staff.id;
                                  const isBusy = staff.available === false;
                                  return (
                                    <button
                                      key={staff.id}
                                      onClick={() => setSelectedStaffId(staff.id)}
                                      disabled={isBusy}
                                      className={`flex items-center gap-3 p-2.5 rounded-xl border-2 text-left transition-all ${isSelected
                                        ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                                        : isBusy
                                          ? 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 opacity-60 cursor-not-allowed'
                                          : 'border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/40 dark:hover:border-teal-700 cursor-pointer'
                                        }`}
                                    >
                                      <div className="relative shrink-0">
                                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center text-white font-bold text-sm">
                                          {staff.fullName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${isBusy ? 'bg-red-400' : 'bg-green-400'}`} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{staff.fullName}</p>
                                        <p className="text-[10px] text-slate-400 truncate">{(staff.specialization && SPECIALTY_MAP[staff.specialization]) || staff.specialization || ROLE_MAP[staff.role] || staff.role || 'Nh├ón vi├¬n'}</p>
                                      </div>
                                      <div className="shrink-0 text-right">
                                        {isBusy ? (
                                          <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">Bß║¡n</span>
                                        ) : (
                                          isSelected
                                            ? <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            : <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full">Rß║únh</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Busy staff warning + suggestions */}
                            {selectedStaffBusy && (
                              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="material-symbols-outlined text-amber-500 text-base mt-0.5 shrink-0">warning</span>
                                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                                    Nh├ón vi├¬n n├áy ─æ├ú c├│ lß╗ïch v├áo khung giß╗¥ bß║ín chß╗ìn.
                                  </p>
                                </div>
                                {suggestedStaff.length > 0 && (
                                  <>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-300 mb-2 font-medium">Gß╗úi ├╜ nh├ón vi├¬n rß║únh:</p>
                                    <div className="flex flex-col gap-1.5">
                                      {suggestedStaff.map((s) => (
                                        <button
                                          key={s.id}
                                          onClick={() => setSelectedStaffId(s.id)}
                                          className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-700 hover:border-[#1a2b4c] dark:hover:border-teal-500 transition-colors text-left"
                                        >
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-[#1a2b4c] flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {s.fullName.charAt(0).toUpperCase()}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{s.fullName}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{(s.specialization && SPECIALTY_MAP[s.specialization]) || s.specialization || ROLE_MAP[s.role] || s.role || 'Nh├ón vi├¬n'}</p>
                                          </div>
                                          <span className="text-[10px] font-bold text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded-full shrink-0">Chß╗ìn</span>
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                                {suggestedStaff.length === 0 && (
                                  <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                                    Kh├┤ng c├│ nh├ón vi├¬n rß║únh v├áo khung giß╗¥ n├áy. Vui l├▓ng chß╗ìn giß╗¥ kh├íc.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-2 p-4 rounded-xl border border-teal-100 dark:border-teal-800/50 bg-teal-50/50 dark:bg-teal-900/20 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-800/50 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                                <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                  {shop.assignmentMode === 'AUTO' ? 'psychology' : 'groups'}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-teal-900 dark:text-teal-100 mb-1">
                                  {shop.assignmentMode === 'AUTO' ? 'Ph├ón bß╗ò th├┤ng minh (AI)' : '─Éß╗Öi ng┼⌐ chuy├¬n nghiß╗çp'}
                                </h4>
                                <p className="text-xs text-teal-700 dark:text-teal-300 leading-relaxed">
                                  {shop.assignmentMode === 'AUTO'
                                    ? 'Hß╗ç thß╗æng AI sß║╜ ph├ón t├¡ch v├á lß╗▒a chß╗ìn nh├ón vi├¬n c├│ chuy├¬n m├┤n ph├╣ hß╗úp nhß║Ñt ─æang rß║únh v├áo khung giß╗¥ bß║ín chß╗ìn.'
                                    : '─É╞ín sß║╜ ─æ╞░ß╗úc chuyß╗ân ─æß║┐n hß╗ç thß╗æng cß╗ºa ph├▓ng kh├ím. Nh├ón vi├¬n chuy├¬n m├┤n ph├╣ hß╗úp nhß║Ñt sß║╜ chß╗º ─æß╗Öng tiß║┐p nhß║¡n ─æß╗â phß╗Ñc vß╗Ñ b├⌐.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Fixed CTA Footer */}
                <div className="hidden lg:flex p-4 sm:p-6 pt-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex-col gap-4 shrink-0">
                  {/* CTA */}
                  <button
                    onClick={handleBookClick}
                    disabled={!canBook}
                    className={`w-full h-12 flex items-center justify-center gap-2 rounded-xl font-bold transition-all text-base ${canBook
                      ? "bg-[#1a2b4c] dark:bg-teal-500 text-white hover:bg-[#243d6b] dark:hover:bg-teal-400 hover:scale-[1.02] shadow-lg shadow-[#1a2b4c]/25 dark:shadow-teal-900/50 cursor-pointer"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border dark:border-slate-700 cursor-not-allowed"
                      }`}
                  >
                    <span className="material-symbols-outlined">calendar_month</span>
                    {canBook
                      ? (editBooking ? "Cß║¡p nhß║¡t lß╗ïch" : "─Éß║╖t lß╗ïch ngay")
                      : !isHotelSelected && !hasNormalServices
                        ? "Chß╗ìn dß╗ïch vß╗Ñ tr╞░ß╗¢c"
                        : isHotelSelected && !boardingReady
                          ? "Chß╗ìn ng├áy nhß║¡n & trß║ú ph├▓ng"
                          : hasNormalServices && !normalReady
                            ? "Chß╗ìn ng├áy & giß╗¥ hß║╣n"
                            : (editBooking ? "Cß║¡p nhß║¡t lß╗ïch" : "─Éß║╖t lß╗ïch ngay")}
                  </button>



                  <div className="flex items-center justify-center gap-1 text-xs text-slate-400 font-medium">
                    <span className="material-symbols-outlined text-sm text-teal-500">
                      verified_user
                    </span>
                    ─Éß║╖t lß╗ïch miß╗àn ph├¡ ┬╖ Hß╗ºy dß╗à d├áng
                  </div>
                </div>
              </div>

              {/* Map and Nearby Shops Restored to Right Column */}
              <div className="flex flex-col gap-6">
                {/* Map Card */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4 shadow-sm">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400">location_on</span>
                    ─Éß╗ïa chß╗ë & Li├¬n hß╗ç
                  </h3>
                  <div
                    className="w-full h-40 rounded-xl overflow-hidden relative cursor-pointer group bg-slate-100 dark:bg-slate-800"
                    onClick={() => {
                      if (userLocation && shop && shop.latitude && shop.longitude) {
                        setShowMap(true);
                      }
                    }}
                  >
                    {/* The actual mini map */}
                    {userLocation && shop && shop.latitude && shop.longitude && (
                      <div className="absolute inset-0 pointer-events-none z-0">
                        <ShopMap
                          userLocation={userLocation}
                          nearbyShops={[]}
                          currentShop={{
                            id: shop.id,
                            latitude: shop.latitude,
                            longitude: shop.longitude,
                            shopName: shop.shopName,
                          }}
                        />
                      </div>
                    )}

                    {/* Overlay for hover effect */}
                    <div className="absolute inset-0 bg-transparent group-hover:bg-[#1a2b4c]/10 transition-colors z-10" />
                    {userLocation && shop && shop.latitude && shop.longitude ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMap(true);
                        }}
                        className="absolute bottom-3 right-3 bg-white text-[#1a2b4c] px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md hover:bg-slate-100 transition-all flex items-center gap-1 z-10"
                      >
                        <span className="material-symbols-outlined text-sm">open_in_new</span>
                        Mß╗ƒ bß║ún ─æß╗ô
                      </button>
                    ) : (
                      <div className="absolute bottom-3 right-3 bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-md flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_off</span>
                        Ch╞░a c├│ vß╗ï tr├¡
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5 text-lg">map</span>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {shop ? `${shop.address}${shop.city ? `, ${shop.city}` : ''}` : '---'}
                      </p>
                    </div>
                    <div className="flex items-start gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 mt-0.5 text-lg">schedule</span>
                      <div className="flex flex-col text-xs">
                        {shop?.openTime && shop?.closeTime ? (
                          <>
                            <span className="text-green-600 dark:text-green-400 font-semibold">─Éang mß╗ƒ cß╗¡a</span>
                            <span className="text-slate-500 dark:text-slate-400">
                              {shop.openTime} - {shop.closeTime}
                              {shop.workingDays ? ` (${shop.workingDays})` : ''}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Ch╞░a cß║¡p nhß║¡t giß╗¥ mß╗ƒ cß╗¡a</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 px-1">
                      <span className="material-symbols-outlined text-slate-400 text-lg">phone</span>
                      <a href={`tel:${shop?.phone}`} className="text-xs text-[#1a2b4c] dark:text-teal-400 font-semibold hover:underline">
                        {shop?.phone ?? '---'}
                      </a>
                    </div>
                  </div>
                </div>


              </div>
            </div>
          </div>
        </div>
        {/* Mobile bottom bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] pb-safe">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">
              {totalPrice > 0 ? 'Tß╗òng cß╗Öng' : 'Gi├í chß╗ë tß╗½'}
            </span>
            <span className="font-black text-xl text-[#1a2b4c] dark:text-teal-400">
              {totalPrice > 0 
                ? `${totalPrice.toLocaleString('vi-VN')}─æ` 
                : (apiServices.length > 0 ? `${Math.min(...apiServices.map(s => s.price)).toLocaleString('vi-VN')}─æ` : '---')}
            </span>
          </div>
          <div className="flex flex-1">
            <button
              onClick={() => {
                if (canBook) {
                  handleBookClick();
                } else {
                  document.getElementById('booking-section')?.scrollIntoView({ behavior: 'smooth' });
                  // import('react-hot-toast').then(({ toast }) => toast('Vui l├▓ng chß╗ìn dß╗ïch vß╗Ñ v├á thß╗¥i gian.'));
                }
              }}
              className={`flex-1 h-12 flex items-center justify-center gap-2 rounded-xl font-bold transition-all text-sm uppercase tracking-wider ${canBook
                ? "bg-[#1a2b4c] dark:bg-teal-500 text-white shadow-lg shadow-[#1a2b4c]/25 dark:shadow-teal-900/50"
                : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
            >
              <span className="material-symbols-outlined text-base">calendar_month</span>
              {canBook
                ? (editBooking ? "Cß║¡p nhß║¡t lß╗ïch" : "─Éß║╖t lß╗ïch ngay")
                : !isHotelSelected && !hasNormalServices
                  ? "Chß╗ìn dß╗ïch vß╗Ñ"
                  : isHotelSelected && !boardingReady
                    ? "Chß╗ìn ng├áy ph├▓ng"
                    : hasNormalServices && !normalReady
                      ? "Chß╗ìn ng├áy giß╗¥"
                      : "─Éß║╖t lß╗ïch ngay"}
            </button>
          </div>
        </div>

        {/* Space for mobile bottom bar */}
        <div className="lg:hidden h-24" />

        {/* ΓöÇΓöÇ Pet Selection Modal ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */}
        {showPetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Chß╗ìn th├║ c╞░ng</h2>
                  <p className="text-xs text-slate-500 mt-0.5">B├⌐ n├áo sß║╜ sß╗¡ dß╗Ñng dß╗ïch vß╗Ñ h├┤m nay?</p>
                </div>
                <button
                  onClick={() => { setShowPetModal(false); setViewingBookingsPetId(null); setPetBookings([]); setPetAvailabilityMap({}); }}
                  className="w-9 h-9 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-slate-500">close</span>
                </button>
              </div>

              {/* Pet list */}
              <div className="p-4 sm:p-5 space-y-3 max-h-72 overflow-y-auto">
                {myPets.length === 0 || showQuickAddPet ? (
                  <div className="space-y-4">
                    {myPets.length === 0 && !showQuickAddPet && (
                      <div className="text-center py-6 text-slate-400">
                        <span className="material-symbols-outlined text-4xl block mb-2">pets</span>
                        <p className="text-sm font-semibold mb-3">Bß║ín ch╞░a c├│ th├║ c╞░ng n├áo</p>
                        <button
                          onClick={() => setShowQuickAddPet(true)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a2b4c] text-white text-sm font-bold rounded-xl hover:bg-[#243d6b] transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">add</span>
                          Th├¬m th├║ c╞░ng ngay
                        </button>
                      </div>
                    )}
                    {showQuickAddPet && (
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3 border border-slate-200 dark:border-slate-600">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base text-[#1a2b4c] dark:text-teal-400">add_circle</span>
                            Th├¬m th├║ c╞░ng nhanh
                          </h4>
                          <button onClick={() => setShowQuickAddPet(false)} className="text-slate-400 hover:text-slate-600">
                            <span className="material-symbols-outlined text-lg">close</span>
                          </button>
                        </div>
                        {/* T├¬n */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">T├¬n th├║ c╞░ng *</label>
                          <input
                            type="text"
                            placeholder="VD: Milo, Lucky..."
                            value={quickPetForm.name}
                            onChange={(e) => setQuickPetForm(prev => ({ ...prev, name: e.target.value }))}
                            className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1a2b4c] dark:focus:border-teal-400 outline-none transition-colors"
                          />
                        </div>
                        {/* Lo├ái */}
                        <div>
                          <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Lo├ái *</label>
                          <div className="mt-1 flex gap-2">
                            {['Ch├│', 'M├¿o'].map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => setQuickPetForm(prev => ({ ...prev, species: s }))}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                  quickPetForm.species === s
                                    ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 text-[#1a2b4c] dark:border-teal-400 dark:bg-teal-900/10 dark:text-teal-400'
                                    : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                {s === 'Ch├│' ? '≡ƒÉ╢' : '≡ƒÉ▒'} {s}
                              </button>
                            ))}
                          </div>
                        </div>
                        {/* Giß╗æng + C├ón nß║╖ng */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Giß╗æng</label>
                            <input
                              type="text"
                              placeholder="VD: Corgi, Munchkin..."
                              value={quickPetForm.breed}
                              onChange={(e) => setQuickPetForm(prev => ({ ...prev, breed: e.target.value }))}
                              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1a2b4c] dark:focus:border-teal-400 outline-none transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">C├ón nß║╖ng (kg) *</label>
                            <input
                              type="number"
                              placeholder="VD: 5"
                              min="0.1"
                              step="0.1"
                              value={quickPetForm.weight}
                              onChange={(e) => setQuickPetForm(prev => ({ ...prev, weight: e.target.value }))}
                              className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#1a2b4c] dark:focus:border-teal-400 outline-none transition-colors"
                            />
                          </div>
                        </div>
                        {/* L╞░u ├╜ */}
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1">
                          <span className="material-symbols-outlined text-xs mt-0.5">info</span>
                          Bß║ín c├│ thß╗â bß╗ò sung th├¬m ng├áy sinh, ß║únh, sß╗⌐c khß╗Åe... sau tß║íi mß╗Ñc "Th├║ c╞░ng cß╗ºa t├┤i"
                        </p>
                        {/* N├║t submit */}
                        <button
                          onClick={handleQuickAddPet}
                          disabled={!quickPetForm.name.trim() || !quickPetForm.weight || quickPetSubmitting}
                          className="w-full py-3 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          {quickPetSubmitting ? (
                            <>
                              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                              ─Éang th├¬m...
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-base">pets</span>
                              Th├¬m th├║ c╞░ng
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ) : loadingPetAvailability ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    <span className="text-sm">─Éang kiß╗âm tra lß╗ïch hß║╣n...</span>
                  </div>
                ) : (
                  (myPets as any[]).filter((p: any) => p.active).map((pet: any) => {
                    const isAvailable = petAvailabilityMap[pet.id] !== false; // undefined = ch╞░a check = cho ph├⌐p
                    const isBusy = petAvailabilityMap[pet.id] === false;
                    const isSelected = selectedPet?.id === pet.id;

                    return (
                      <div key={pet.id} className="flex items-center gap-2">
                        {/* Pet card */}
                        <button
                          onClick={() => !isBusy && setSelectedPet(pet)}
                          disabled={isBusy}
                          className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${isBusy
                            ? 'border-slate-200 dark:border-slate-700 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/50'
                            : isSelected
                              ? 'border-[#1a2b4c] bg-[#1a2b4c]/5 dark:border-teal-400 dark:bg-teal-900/10'
                              : 'border-slate-200 dark:border-slate-700 hover:border-[#1a2b4c]/40'
                            }`}
                        >
                          <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-600 shadow">
                            {pet.avatar
                              ? <img src={pet.avatar} alt={pet.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400">pets</span>
                              </div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white">{pet.name}</p>
                            <p className="text-xs text-slate-500">{pet.species} ┬╖ {pet.breed} ┬╖ {pet.weight}kg</p>
                            {isBusy && (
                              <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full">
                                <span className="material-symbols-outlined text-xs">event_busy</span>
                                ─É├ú c├│ lß╗ïch hß║╣n
                              </span>
                            )}
                          </div>
                          {isSelected && !isBusy && (
                            <span className="material-symbols-outlined text-[#1a2b4c] dark:text-teal-400 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                        </button>

                        {/* N├║t xem lß╗ïch hß║╣n ΓÇö chß╗ë hiß╗çn khi pet bß╗ï busy */}
                        {isBusy && (
                          <button
                            onClick={async () => {
                              setViewingBookingsPetId(pet.id);
                              setLoadingPetBookings(true);
                              try {
                                const res = await bookingService.getMyBookings();
                                const bookingsList = Array.isArray(res) ? res : (res?.content || []);
                                const active = bookingsList.filter((b: any) =>
                                  b.petId === pet.id &&
                                  ['CONFIRMED', 'IN_PROGRESS'].includes(b.status)
                                );
                                setPetBookings(active);
                              } catch {
                                setPetBookings([]);
                              } finally {
                                setLoadingPetBookings(false);
                              }
                            }}
                            className="shrink-0 w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
                            title="Xem lß╗ïch hß║╣n cß╗ºa b├⌐"
                          >
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}

                {/* N├║t th├¬m th├║ c╞░ng mß╗¢i (khi ─æ├ú c├│ pets) */}
                {myPets.length > 0 && !showQuickAddPet && !loadingPetAvailability && (
                  <button
                    onClick={() => setShowQuickAddPet(true)}
                    className="w-full mt-2 py-2.5 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm font-bold rounded-xl hover:border-[#1a2b4c] hover:text-[#1a2b4c] dark:hover:border-teal-400 dark:hover:text-teal-400 transition-all flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    Th├¬m th├║ c╞░ng mß╗¢i
                  </button>
                )}

                {/* Panel xem lß╗ïch hß║╣n cß╗ºa pet */}
                {viewingBookingsPetId !== null && (
                  <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-base">event_busy</span>
                        Lß╗ïch hß║╣n ─æang hoß║ít ─æß╗Öng
                      </p>
                      <button
                        onClick={() => { setViewingBookingsPetId(null); setPetBookings([]); }}
                        className="text-amber-500 hover:text-amber-700"
                      >
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                    {loadingPetBookings ? (
                      <div className="flex items-center gap-2 text-amber-600 text-xs">
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                        ─Éang tß║úi...
                      </div>
                    ) : petBookings.length === 0 ? (
                      <p className="text-xs text-amber-600">Kh├┤ng t├¼m thß║Ñy lß╗ïch hß║╣n.</p>
                    ) : (
                      <div className="space-y-2">
                        {petBookings.map((b: any) => (
                          <div key={b.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-xs border border-amber-100 dark:border-amber-900">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-slate-800 dark:text-slate-100">#{b.id} ┬╖ {b.shopName}</span>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${b.status === 'CONFIRMED'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                {b.status === 'CONFIRMED' ? '─É├ú x├íc nhß║¡n' : '─Éang thß╗▒c hiß╗çn'}
                              </span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400">{b.serviceName}</p>
                            <p className="text-slate-500 dark:text-slate-500 mt-0.5">
                              ≡ƒòÉ {new Date(b.appointmentDatetime).toLocaleString('vi-VN', {
                                day: '2-digit', month: '2-digit', year: 'numeric',
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                <button
                  onClick={() => { setShowPetModal(false); setViewingBookingsPetId(null); setPetBookings([]); setPetAvailabilityMap({}); }}
                  className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                >
                  Hß╗ºy
                </button>
                <button
                  onClick={handleConfirmPet}
                  disabled={!selectedPet || checkingPet}
                  className="flex-1 py-3 bg-[#1a2b4c] text-white font-bold rounded-xl hover:bg-[#243d6b] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {checkingPet ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                      ─Éang kiß╗âm tra...
                    </>
                  ) : (
                    'Tiß║┐p tß╗Ñc thanh to├ín ΓåÆ'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Staff Detail Modal */}
        {selectedStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedStaff(null)}>
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header / Cover */}
              <div className="relative h-32 shrink-0 bg-gradient-to-r from-[#1a2b4c] to-indigo-900">
                <button
                  onClick={() => setSelectedStaff(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="px-4 sm:px-8 pb-8">
                {/* Profile Info */}
                <div className="relative flex flex-col md:flex-row gap-6 -mt-12 mb-8">
                  <div className="relative">
                    <img
                      src={(selectedStaff as any).avatar || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=200&auto=format&fit=crop'}
                      alt={selectedStaff.fullName}
                      className="size-32 rounded-3xl object-cover border-4 border-white dark:border-slate-900 shadow-xl"
                    />
                    <div className="absolute -bottom-2 -right-2 size-8 rounded-full bg-teal-500 border-4 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-lg">
                      <span className="material-symbols-outlined text-xs">check_circle</span>
                    </div>
                  </div>
                  <div className="pt-14 md:pt-14 flex-1">
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {selectedStaff.fullName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {ROLE_MAP[selectedStaff.role] || selectedStaff.role}
                      </span>
                      <span className="text-slate-400">ΓÇó</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">
                        {SPECIALTY_MAP[selectedStaff.specialization] || selectedStaff.specialization}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Detail Content */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">badge</span>
                        Th├┤ng tin li├¬n hß╗ç
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-base">call</span>
                          </div>
                          <span className="text-sm font-medium">{selectedStaff.phone || 'Ch╞░a cß║¡p nhß║¡t'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300">
                          <div className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                            <span className="material-symbols-outlined text-base">mail</span>
                          </div>
                          <span className="text-sm font-medium truncate">{(selectedStaff as any).email || 'Ch╞░a cß║¡p nhß║¡t'}</span>
                        </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">verified_user</span>
                        Chß╗⌐ng chß╗ë & Bß║▒ng cß║Ñp
                      </h4>
                      {selectedStaff.certificates && selectedStaff.certificates.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {selectedStaff.certificates.map((cert) => (
                            <div
                              key={cert.id}
                              className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${cert.status === 'VERIFIED'
                                ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/50'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-800'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 capitalize">{cert.certificateName}</span>
                                {cert.status === 'VERIFIED' && (
                                  <span className="material-symbols-outlined text-teal-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                )}
                              </div>
                              {cert.imageUrl && (
                                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 group/img">
                                  <img
                                    src={cert.imageUrl}
                                    alt={cert.certificateName}
                                    className="w-full h-full object-cover transition-transform group-hover/img:scale-110"
                                  />
                                  <a
                                    href={cert.imageUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity"
                                  >
                                    <span className="material-symbols-outlined text-2xl">zoom_in</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">Ch╞░a c├│ th├┤ng tin chß╗⌐ng chß╗ë.</p>
                      )}
                    </section>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <button
                    onClick={() => setSelectedStaff(null)}
                    className="px-8 py-3 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-bold hover:opacity-90 transition-all shadow-xl shadow-slate-200 dark:shadow-none"
                  >
                    ─É├│ng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Service Detail Modal */}
        {selectedServiceForDetail && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedServiceForDetail(null)}>
            <div
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header / Cover */}
              <div className="relative h-48 shrink-0 bg-slate-100 dark:bg-slate-800">
                {selectedServiceForDetail.imageUrl ? (
                  <img
                    src={selectedServiceForDetail.imageUrl}
                    alt={selectedServiceForDetail.serviceName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-[#1a2b4c] to-indigo-900">
                    <span className="material-symbols-outlined text-white text-6xl">pets</span>
                  </div>
                )}
                <button
                  onClick={() => setSelectedServiceForDetail(null)}
                  className="absolute top-4 right-4 size-10 rounded-full bg-white/20 hover:bg-white/40 text-white flex items-center justify-center transition-colors backdrop-blur-md"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="p-4 sm:p-8">
                {/* Title & Price */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {selectedServiceForDetail.serviceName}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
                        {selectedServiceForDetail.category}
                      </span>
                      <span className="text-slate-400">ΓÇó</span>
                      <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        {selectedServiceForDetail.durationMinutes} ph├║t
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="font-black text-2xl text-slate-900 dark:text-white">
                        {selectedServiceForDetail.price.toLocaleString('vi-VN')}─æ
                      </span>
                      <span className="text-xs text-slate-400">
                        {selectedServiceForDetail.category === 'BOARDING' || selectedServiceForDetail.category.toUpperCase() === 'HOTEL' ? '/ng├áy' : '/lß║ºn'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <section className="mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">description</span>
                    M├┤ tß║ú dß╗ïch vß╗Ñ
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {selectedServiceForDetail.description || 'Ch╞░a c├│ m├┤ tß║ú chi tiß║┐t cho dß╗ïch vß╗Ñ n├áy.'}
                  </p>
                </section>

                {/* Features / Benefits */}
                <section className="mb-6">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">task_alt</span>
                    Bao gß╗ôm trong dß╗ïch vß╗Ñ
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Quy tr├¼nh chuß║⌐n y khoa / chuy├¬n nghiß╗çp</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Sß╗¡ dß╗Ñng sß║ún phß║⌐m cao cß║Ñp, an to├án</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>Nh├ón vi├¬n c├│ chß╗⌐ng chß╗ë chuy├¬n m├┤n</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-teal-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      <span>T╞░ vß║Ñn ch─âm s├│c sau dß╗ïch vß╗Ñ</span>
                    </div>
                  </div>
                </section>

                {/* Action */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                  <button
                    onClick={() => setSelectedServiceForDetail(null)}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    ─É├│ng
                  </button>
                  <button
                    onClick={() => {
                      toggleService(selectedServiceForDetail.id);
                      setSelectedServiceForDetail(null);
                    }}
                    className={`px-6 py-3 rounded-2xl font-bold transition-all shadow-xl flex items-center gap-2 ${(selectedServiceForDetail.category === 'BOARDING' || selectedServiceForDetail.category.toUpperCase() === 'HOTEL' ? isHotelSelected : selectedServiceIds.includes(selectedServiceForDetail.id))
                      ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-200 dark:shadow-none'
                      : 'bg-[#1a2b4c] text-white hover:bg-[#243d6b] shadow-slate-200 dark:shadow-none'
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {(selectedServiceForDetail.category === 'BOARDING' || selectedServiceForDetail.category.toUpperCase() === 'HOTEL' ? isHotelSelected : selectedServiceIds.includes(selectedServiceForDetail.id)) ? 'remove_circle' : 'add_circle'}
                    </span>
                    {(selectedServiceForDetail.category === 'BOARDING' || selectedServiceForDetail.category.toUpperCase() === 'HOTEL' ? isHotelSelected : selectedServiceIds.includes(selectedServiceForDetail.id)) ? 'Bß╗Å chß╗ìn' : 'Chß╗ìn dß╗ïch vß╗Ñ'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {/* ΓöÇΓöÇ MAP MODAL ΓöÇΓöÇ */}
        <AnimatePresence>
          {showMap && userLocation && shop && shop.latitude && shop.longitude && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowMap(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                className={`bg-white dark:bg-slate-900 overflow-hidden flex flex-col relative shadow-2xl transition-all duration-300 ${isMapFullscreen
                  ? 'w-full h-full rounded-none'
                  : 'rounded-[32px] w-full max-w-5xl h-[85vh]'
                  }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-3xl">map</span>
                      Vß╗ï tr├¡ & Chß╗ë ─æ╞░ß╗¥ng
                    </h2>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 mt-1">─Éß║┐n {shop.shopName}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <button
                      onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                      className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700"
                      title={isMapFullscreen ? "Thu nhß╗Å" : "Ph├│ng to"}
                    >
                      <span className="material-symbols-outlined">
                        {isMapFullscreen ? 'fullscreen_exit' : 'fullscreen'}
                      </span>
                    </button>
                    <button
                      onClick={() => handleGetDirections(shopId)}
                      className="flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-primary text-white rounded-2xl text-xs sm:text-sm font-black hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 hover:-translate-y-0.5 uppercase tracking-widest"
                    >
                      <span className="material-symbols-outlined text-lg">directions</span>
                      Chß╗ë ─æ╞░ß╗¥ng
                    </button>
                    <button
                      onClick={() => {
                        setShowMap(false);
                        setIsMapFullscreen(false);
                      }}
                      className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                {/* Map Body */}
                <div className="flex-1 min-h-0 relative bg-slate-50 dark:bg-slate-950 p-2">
                  <div className="w-full h-full rounded-[24px] overflow-hidden shadow-inner border border-slate-200/50 dark:border-slate-800">
                    <ShopMap
                      userLocation={userLocation}
                      nearbyShops={[]}
                      currentShop={{
                        id: shop.id,
                        latitude: shop.latitude,
                        longitude: shop.longitude,
                        shopName: shop.shopName,
                      }}
                      directions={directions}
                      onShopClick={(id) => {
                        setShowMap(false);
                        navigate(`/clinic/${id}`);
                      }}
                    />
                  </div>
                </div>

                {/* Directions Summary Footer */}
                <AnimatePresence>
                  {directions && directions.routes && directions.routes.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100 dark:border-slate-800 p-4 sm:p-6 shrink-0 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-4 sm:gap-8 justify-center">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[16px] bg-teal-500/10 text-teal-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-xl sm:text-2xl">straighten</span>
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-400">Khoß║úng c├ích</p>
                            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                              {directions.routes[0].legs[0].distance.text}
                            </p>
                          </div>
                        </div>
                        <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-[16px] bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">schedule</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Thß╗¥i gian</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
                              {directions.routes[0].legs[0].duration.text}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Login Prompt Modal */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-[28px] overflow-hidden shadow-2xl relative"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
                  <span className="material-symbols-outlined text-4xl text-indigo-500">lock_person</span>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                  Y├¬u cß║ºu ─æ─âng nhß║¡p
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
                  Bß║ín cß║ºn ─æ─âng nhß║¡p hoß║╖c tß║ío t├ái khoß║ún ─æß╗â c├│ thß╗â ─æß║╖t lß╗ïch hß║╣n, gß╗ìi ─æiß╗çn v├á nhß║»n tin vß╗¢i c╞í sß╗ƒ n├áy.
                </p>

                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => navigate('/login', { state: { from: `/clinic/${shopId}` } })}
                    className="w-full py-3.5 px-4 bg-[#1a2b4c] text-white rounded-xl font-bold hover:bg-[#111c33] transition-colors"
                  >
                    ─É─âng nhß║¡p ngay
                  </button>
                  <button
                    onClick={() => navigate('/register', { state: { from: `/clinic/${shopId}` } })}
                    className="w-full py-3.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Tß║ío t├ái khoß║ún mß╗¢i
                  </button>
                  <button
                    onClick={() => setShowLoginPrompt(false)}
                    className="w-full py-3 px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold text-sm transition-colors mt-2"
                  >
                    Bß╗Å qua
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
