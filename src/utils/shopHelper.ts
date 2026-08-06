export const SHOP_TYPE_MAP: Record<string, string> = {
  CLINIC: 'Khám thú y',
  SPA: 'Spa & Grooming',
  GROOMING: 'Spa & Grooming',
  HOTEL: 'Lưu trú',
  BOARDING: 'Lưu trú',
  MIXED: 'Tổng hợp',
};

export const translateShopType = (type: string): string => {
  const upper = type.trim().toUpperCase();
  return SHOP_TYPE_MAP[upper] || type;
};

export const getShopTypeLabel = (type: string | undefined): string => {
  if (!type) return '';
  if (type.includes(',')) {
    return type
      .split(',')
      .map(t => translateShopType(t))
      .filter(Boolean)
      .join(' + ');
  }
  return translateShopType(type);
};

export const formatPetWeightLabel = (tierId: string, allTiers?: string[], itemIdx?: number): string => {
  if (!allTiers || allTiers.length === 0) return tierId;
  const idx = typeof itemIdx === 'number' ? itemIdx : allTiers.indexOf(tierId);
  if (idx === -1) return tierId;

  const thresholds = allTiers.map(t => {
    const num = parseFloat(t.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  });

  if (thresholds.length >= 2) {
    if (idx === 0) {
      return `< ${thresholds[0]} kg`;
    } else if (idx === thresholds.length - 1) {
      return `Trên ${thresholds[idx]} kg`;
    } else {
      return `${thresholds[idx - 1]} - ${thresholds[idx]} kg`;
    }
  }
  
  return tierId;
};

export const formatWorkingDays = (workingDaysStr: string | undefined): string => {
  if (!workingDaysStr) return '';
  
  const dayOrder = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
  
  const selectedDays = workingDaysStr
    .split(',')
    .map(d => d.trim())
    .filter(d => dayOrder.includes(d));
    
  if (selectedDays.length === 0) return '';
  if (selectedDays.length === 7) return 'All day';
  
  selectedDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));
  
  const ranges: string[][] = [];
  let currentRange: string[] = [];
  
  for (let i = 0; i < selectedDays.length; i++) {
    const day = selectedDays[i];
    if (currentRange.length === 0) {
      currentRange.push(day);
    } else {
      const prevDay = currentRange[currentRange.length - 1];
      const prevIdx = dayOrder.indexOf(prevDay);
      const currIdx = dayOrder.indexOf(day);
      
      if (currIdx === prevIdx + 1) {
        currentRange.push(day);
      } else {
        ranges.push(currentRange);
        currentRange = [day];
      }
    }
  }
  if (currentRange.length > 0) {
    ranges.push(currentRange);
  }
  
  return ranges
    .map(range => {
      if (range.length === 1) {
        return range[0];
      } else if (range.length === 2) {
        return `${range[0]}, ${range[1]}`;
      } else {
        return `${range[0]} - ${range[range.length - 1]}`;
      }
    })
    .join(', ');
};

export const stripHtml = (html: string | undefined): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
};

export const formatServiceDuration = (minutes: number | undefined | null, category?: string): string => {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes <= 0) return '';
  const catUpper = (category || '').trim().toUpperCase();
  if (catUpper === 'BOARDING' || catUpper === 'HOTEL') {
    const days = Math.round(minutes / 1440) || 1;
    return `${days} ngày`;
  }
  if (minutes >= 1440) {
    const days = Math.round(minutes / 1440);
    return `${days} ngày`;
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return `${minutes / 60} giờ`;
  }
  return `${minutes} phút`;
};

export const checkIsShopOpen = (
  openTime?: string,
  closeTime?: string,
  workingDaysStr?: string
): boolean => {
  if (!openTime || !closeTime) return false;

  const now = new Date();

  if (workingDaysStr) {
    const jsDayToDayName: Record<number, string> = {
      0: 'Chủ nhật',
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
    };
    const currentDayName = jsDayToDayName[now.getDay()];
    const selectedDays = workingDaysStr
      .split(',')
      .map(d => d.trim());

    if (selectedDays.length > 0 && !selectedDays.includes(currentDayName)) {
      return false;
    }
  }

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const parts = timeStr.trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (openMinutes === null || closeMinutes === null) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (closeMinutes > openMinutes) {
    return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }
};

