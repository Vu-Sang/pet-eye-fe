declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

const isEnabled = import.meta.env.VITE_GA4_ENABLED === 'true';

function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (isEnabled && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (import.meta.env.DEV) {
      console.log(`[GA4 Event] ${eventName}`, params);
    }
    window.gtag('event', eventName, params);
  }
}

// === LANDING PAGE ===
export const trackHeroSearch = (query: string, serviceType: string) =>
  trackEvent('hero_search', { search_term: query, service_type: serviceType });

export const trackClickFeaturedShop = (shopId: number, shopName: string, position: number) =>
  trackEvent('click_featured_shop', { shop_id: shopId, shop_name: shopName, position });

export const trackUseGpsNearby = (status: 'success' | 'error') =>
  trackEvent('use_gps_nearby', { status });

export const trackClickCta = (ctaName: string, ctaLocation: string) =>
  trackEvent('click_cta', { cta_name: ctaName, cta_location: ctaLocation });

// === HOME PAGE ===
export const trackHomepageQuickAction = (actionType: string) =>
  trackEvent('homepage_quick_action', { action_type: actionType });

export const trackHomepageSearchService = (query: string, category: string) =>
  trackEvent('homepage_search_service', { search_term: query, category });

export const trackViewPetProfile = (petId: number, petName: string) =>
  trackEvent('view_pet_profile', { pet_id: petId, pet_name: petName });

// === SEARCH (VetSearch) ===
export const trackSearch = (query: string, filters: Record<string, any>, resultCount: number) =>
  trackEvent('search', { search_term: query, ...filters, results_count: resultCount });

export const trackFilterChange = (filterName: string, filterValue: string) =>
  trackEvent('filter_change', { filter_name: filterName, filter_value: filterValue });

// === CLINIC DETAIL ===
export const trackViewClinic = (shopId: number, shopName: string, shopType: string) =>
  trackEvent('view_clinic', { shop_id: shopId, shop_name: shopName, shop_type: shopType });

export const trackBookingStep = (step: number, stepName: string, details?: object) =>
  trackEvent('booking_step', { step, step_name: stepName, ...details });

export const trackBookingStep1_ServiceSelection = (shopId: number, shopName: string, serviceNames: string[]) => 
  trackEvent('booking_step_1_service', { shop_id: shopId, shop_name: shopName, service_names: serviceNames });

export const trackBookingStep2_TimeSelection = (shopId: number, shopName: string, staffName: string, date: string, time: string) => 
  trackEvent('booking_step_2_time', { shop_id: shopId, shop_name: shopName, staff_name: staffName, date, time });

export const trackBookingStep3_PetSelection = (shopId: number, shopName: string, petName: string) => 
  trackEvent('booking_step_3_pet', { shop_id: shopId, shop_name: shopName, pet_name: petName });

export const trackBookingStep4_PaymentStart = (shopId: number, shopName: string, amount: number, items: string[]) => 
  trackEvent('booking_step_4_payment', { shop_id: shopId, shop_name: shopName, amount, items });

export const trackShareClinic = (shopId: number, method: string) =>
  trackEvent('share_clinic', { shop_id: shopId, method });

export const trackGetDirections = (shopId: number, shopName: string) =>
  trackEvent('get_directions', { shop_id: shopId, shop_name: shopName });

// === PAYMENT ===
export const trackBeginCheckout = (value: number, items: Array<{id: number|string, name: string, price: number}>) =>
  trackEvent('begin_checkout', { currency: 'VND', value, items });

export const trackSelectPaymentMethod = (method: string) =>
  trackEvent('select_payment_method', { payment_method: method });

export const trackSelectVoucher = (voucherCode: string, discountValue: number, discountType: string) =>
  trackEvent('select_voucher', { voucher_code: voucherCode, discount_value: discountValue, discount_type: discountType });

export const trackCheckoutAbandoned = (step: string, value: number) =>
  trackEvent('checkout_abandoned', { step, value });

// === BOOKING SUCCESS ===
export const trackPurchase = (transactionId: string, value: number, shopName: string, items: Array<{item_id: number|string, item_name: string, price: number, quantity: number}>) =>
  trackEvent('purchase', { transaction_id: transactionId, currency: 'VND', value, shop_name: shopName, items });

export const trackBookingSuccess = (shopId: number, shopName: string, transactionId: string, value: number, items: string[]) => 
  trackEvent('booking_success', { shop_id: shopId, shop_name: shopName, transaction_id: transactionId, value, items });

// === AUTH ===
export const trackLogin = (method: 'email' | 'google' | 'facebook' | 'zalo' | string) =>
  trackEvent('login', { method });

export const trackSignUp = (method: 'email' | string) =>
  trackEvent('sign_up', { method });

export const trackAuth = (action: 'login' | 'register', method: string) =>
  trackEvent(action === 'login' ? 'login' : 'sign_up', { method });

// === CHATBOT ===
export const trackChatbotOpen = () =>
  trackEvent('chatbot_open', {});

export const trackChatbotMessage = (messageType: 'user' | 'quick_suggestion', content?: string) =>
  trackEvent('chatbot_message', { message_type: messageType, content_preview: content?.substring(0, 50) });

// === USER IDENTITY ===
export const setUserId = (userId: string) => {
  if (isEnabled && typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('set', { user_id: userId });
  }
};
