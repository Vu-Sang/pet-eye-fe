import React, { useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  shopId: number;
}

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '/api/ws');

/** Keys cần được reload khi có sự kiện cập nhật đơn hàng.
 *  Dùng prefix-match của React Query — chỉ cần khai báo phần đầu của key.
 */
const BOOKING_QUERY_KEYS = [
  ['allShopTasks'],        // ShopBookings - danh sách đơn theo list view
  ['shopBookingsRange'],   // ShopBookings - calendar view (key: ['shopBookingsRange', 'yyyy-MM'])
  ['shopDashboard'],       // ShopDashboard (key: ['shopDashboard', startDate, endDate])
  ['my-notifications'],    // Bell notification badge
];

export default function ShopRealtimeNotification({ shopId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const stopAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
  };

  useEffect(() => {
    if (!shopId || !user) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      debug: () => {},
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      client.subscribe(`/topic/shop/${shopId}/notifications`, (message) => {
        try {
          const data = JSON.parse(message.body);

          if (data.message === 'Có đơn hàng mới!') {
            const soundEnabled = localStorage.getItem('shop_notif_sound_enabled') !== 'false';
            const soundMode = localStorage.getItem('shop_notif_sound_mode') || 'once';

            BOOKING_QUERY_KEYS.forEach(key =>
              queryClient.invalidateQueries({ queryKey: key })
            );

            if (soundEnabled) {
              stopAudio();
              const audio = new Audio('/assets/sounds/notification.mp4');
              activeAudioRef.current = audio;

              if (soundMode === 'loop') {
                let playCount = 1;
                const toastId = toast.custom((t) => (
                  <div
                    className={`${
                      t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-md w-full bg-white dark:bg-slate-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black/5 dark:ring-white/10 p-4 items-center gap-3 justify-between border-l-4 border-indigo-500`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                        <span>🔔</span> Shop vừa có đơn hàng mới!
                      </p>
                      <p className="text-xs font-semibold text-slate-450 dark:text-slate-400 mt-0.5">
                        Chuông báo đang phát lặp lại (tối đa 5 lần).
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        stopAudio();
                        toast.dismiss(t.id);
                      }}
                      className="px-3.5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
                    >
                      Tắt chuông
                    </button>
                  </div>
                ), { duration: Infinity });

                audio.addEventListener('ended', () => {
                  playCount++;
                  if (playCount <= 5) {
                    audio.play().catch(() => {});
                  } else {
                    stopAudio();
                    toast.dismiss(toastId);
                  }
                });

                audio.play().catch(() => {});
              } else {
                audio.play().catch(() => {});
                toast.success('🔔 Shop vừa có đơn hàng mới!');
              }
            } else {
              toast.success('🔔 Shop vừa có đơn hàng mới!');
            }
            return;
          }

          if (data.message === 'BOOKING_UPDATED') {
            // Cập nhật trạng thái đơn: reload ngầm, không làm phiền
            BOOKING_QUERY_KEYS.forEach(key =>
              queryClient.invalidateQueries({ queryKey: key })
            );
          }
        } catch (e) {
          console.error('Error parsing notification', e);
        }
      });
    };

    client.onStompError = (frame) => {
      console.error('STOMP Notif error', frame.headers['message']);
    };

    client.activate();

    return () => {
      if (client.active) client.deactivate();
      stopAudio();
    };
  }, [shopId, user, queryClient]);

  return null; // Component chạy ngầm
}
