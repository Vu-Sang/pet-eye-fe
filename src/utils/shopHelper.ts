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
