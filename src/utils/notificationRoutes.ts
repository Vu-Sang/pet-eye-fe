import type { AppNotification } from '../hooks/useNotifications';

export type NotificationRole = 'shop' | 'customer';

/**
 * Phân tích nội dung title/content để điều hướng chi tiết hơn.
 * Ưu tiên: content keywords → notificationType fallback
 */
function getRouteByContent(
  title: string,
  content: string,
  role: NotificationRole
): string | null {
  const text = `${title} ${content}`.toLowerCase();

  if (role === 'shop') {
    if (/rút tiền|ví|wallet|số dư|hoàn tiền/.test(text)) return '/shop/wallet';
    if (/nhân viên|phân công|đổi nhân viên/.test(text)) return '/shop/staff';
    if (/đơn đặt lịch|lịch hẹn|booking|đặt lịch/.test(text)) return '/shop/bookings';
    if (/đánh giá|review/.test(text)) return '/shop/reviews';
    if (/tin nhắn|chat/.test(text)) return '/shop/messages';
    if (/ngày nghỉ|off/.test(text)) return '/shop/profile';
  } else {
    if (/đặt lịch|lịch hẹn|booking|đơn hàng|đơn của bạn/.test(text)) return '/profile/bookings';
    if (/ví|giao dịch|hoàn tiền|thanh toán/.test(text)) return '/profile/transactions';
    if (/thú cưng|pet/.test(text)) return '/profile/pets';
  }

  return null;
}

/**
 * Trả về route cần điều hướng khi click vào thông báo.
 * Return null nếu không cần navigate (ví dụ thông báo chung).
 */
export function getNotificationRoute(
  notif: AppNotification,
  role: NotificationRole
): string | null {
  // Ưu tiên phân tích nội dung
  const contentRoute = getRouteByContent(notif.title, notif.content, role);
  if (contentRoute) return contentRoute;

  // Fallback theo notificationType
  const type = notif.notificationType ?? 'GENERAL';

  if (role === 'shop') {
    switch (type) {
      case 'BOOKING':   return '/shop/bookings';
      case 'REMINDER':  return '/shop/bookings';
      case 'SYSTEM':    return '/shop/dashboard';
      case 'PROMOTION': return '/shop/dashboard';
      case 'GENERAL':
      default:          return '/shop/notifications';
    }
  } else {
    switch (type) {
      case 'BOOKING':   return '/profile/bookings';
      case 'REMINDER':  return '/profile/bookings';
      case 'SYSTEM':    return '/profile/notifications';
      case 'PROMOTION': return '/';
      case 'GENERAL':
      default:          return '/profile/notifications';
    }
  }
}

/**
 * Xác định thông báo có thể click để điều hướng không
 * (luôn true vì tất cả đều điều hướng ít nhất về trang notifications)
 */
export function isNavigable(_notif: AppNotification): boolean {
  return true;
}
