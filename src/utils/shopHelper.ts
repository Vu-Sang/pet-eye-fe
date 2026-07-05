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

export const formatPetWeightLabel = (tierId: string, allTiers?: string[]): string => {
  if (!allTiers || allTiers.length === 0) return tierId;
  const idx = allTiers.indexOf(tierId);
  if (idx === -1) return tierId;

  const thresholds = allTiers.map(t => {
    const num = parseFloat(t.replace(/[^0-9.]/g, ''));
    return isNaN(num) ? 0 : num;
  });

  if (thresholds.length >= 2) {
    if (idx === 0) {
      return `< ${thresholds[0]} kg`;
    } else {
      return `${thresholds[idx - 1]} - ${thresholds[idx]} kg`;
    }
  }
  
  return tierId;
};
