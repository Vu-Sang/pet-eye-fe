import { useQuery } from '@tanstack/react-query';
import { shopService, ShopPublicResponse } from '../services/shop.service';
import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Debounce a value by `delay` ms — prevents API spam while typing */
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export const POPULAR_SERVICES = [
  { 
    label: 'Cắt tỉa & Tạo kiểu', 
    keywords: ['cắt', 'tỉa', 'grooming', 'tạo kiểu', 'styling', 'trim', 'cạo lông', 'cat tia', 'cat long', 'tia long'] 
  },
  { 
    label: 'Tắm & Sấy vệ sinh', 
    keywords: ['tắm', 'sấy', 'vệ sinh', 'shower', 'bath', 'cleaning', 'wash', 'tam say', 'say kho', 'bo long'] 
  },
  { 
    label: 'Khám & Điều trị bệnh', 
    keywords: ['khám', 'chữa', 'điều trị', 'clinic', 'thú y', 'bác sĩ', 'bệnh', 'kham benh', 'dieu tri', 'thu y', 'bac si', 'medical', 'care'] 
  },
  { 
    label: 'Tiêm phòng (Vaccine)', 
    keywords: ['tiêm', 'chích', 'vaccine', 'ngừa', 'dại', 'tiem phong', 'chich ngua', 'vacxin'] 
  },
  { 
    label: 'Triệt sản & Phẫu thuật', 
    keywords: ['triệt sản', 'thiến', 'mổ', 'phẫu thuật', 'surg', 'triet san', 'thien', 'phau thuat', 'castration'] 
  },
  { 
    label: 'Khách sạn & Lưu trú', 
    keywords: ['lưu trú', 'khách sạn', 'boarding', 'hotel', 'gửi', 'luu tru', 'khach san', 'gui pet', 'chuồng'] 
  },
  { 
    label: 'Xét nghiệm & Siêu âm', 
    keywords: ['xét nghiệm', 'siêu âm', 'x-quang', 'test', 'máu', 'xet nghiem', 'sieu am', 'xquang'] 
  },
  { 
    label: 'Spa & Trị liệu chuyên sâu', 
    keywords: ['trị liệu', 'dưỡng', 'nhuộm', 'cạo', 'massage', 'spa', 'tri lieu', 'duong long', 'nhuom long'] 
  }
];

export function useClinics() {
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Tất cả';
  const initialCity = searchParams.get('city') || '';
  const initialQ = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQ);
  const [cityQuery, setCityQuery] = useState(initialCity);
  const [activeService, setActiveService] = useState(initialType);
  const [minRating, setMinRating] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Debounce text inputs so API is only called after user stops typing
  const debouncedSearch = useDebounce(searchQuery, 400);
  const debouncedCity   = useDebounce(cityQuery,   400);

  const shopTypeParam = activeService === 'Tất cả' ? undefined : activeService;

  const { data: pagedData, isLoading, error } = useQuery({
    queryKey: ['shops-public', debouncedSearch, debouncedCity, shopTypeParam, page],
    queryFn: () => shopService.searchPublicPaged({
      keyword:  debouncedSearch || undefined,
      city:     debouncedCity   || undefined,
      shopType: shopTypeParam,
      page,
    }),
    staleTime: 30_000,
  });

  const shops = pagedData?.content ?? [];
  const totalPages = pagedData?.totalPages ?? 1;
  const totalElements = pagedData?.totalElements ?? 0;

  // Client-side rating filter
  const filteredShops = useMemo(() => {
    let result = shops;
    if (minRating > 0) {
      result = result.filter((s: ShopPublicResponse) => s.ratingAvg >= minRating);
    }
    if (selectedServices.length > 0) {
      result = result.filter((s: ShopPublicResponse) => {
        if (!s.serviceNames || s.serviceNames.length === 0) return false;
        return selectedServices.some(selectedLabel => {
          const popularDef = POPULAR_SERVICES.find(p => p.label === selectedLabel);
          if (!popularDef) return false;
          return s.serviceNames!.some(shopSvcName => {
            const lowerName = shopSvcName.toLowerCase();
            return popularDef.keywords.some(keyword => lowerName.includes(keyword));
          });
        });
      });
    }
    return result;
  }, [shops, minRating, selectedServices]);

  const availableServices = useMemo(() => {
    return POPULAR_SERVICES.map(s => s.label);
  }, []);

  // Reset page khi filter thay đổi
  useEffect(() => { setPage(0); }, [debouncedSearch, debouncedCity, activeService]);

  return {
    clinics: filteredShops,
    isLoading,
    error,
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
  };
}
