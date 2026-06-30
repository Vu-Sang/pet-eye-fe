import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useShopChat } from '../../hooks/useShopChat';
import { bookingService } from '../../services/booking.service';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';
import type { ApiResponse } from '../../types/api';
import ConversationThread from './shared/ConversationThread';
import { useLocation } from 'react-router-dom';

export default function FloatingMessaging() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<{ id: number; name: string; avatar?: string; type?: string } | null>(null);
  const [input, setInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');


  // Lắng nghe event mở popup từ Navbar
  useEffect(() => {
    const handleToggle = () => {
      setOpen(v => {
        if (!v) window.setTimeout(() => window.dispatchEvent(new CustomEvent('close-chatbot')), 0);
        return !v;
      });
    };
    const handleOpen = () => {
      window.dispatchEvent(new CustomEvent('close-chatbot'));
      setOpen(true);
    };
    const handleClose = () => setOpen(false);
    
    window.addEventListener('toggle-messaging', handleToggle);
    window.addEventListener('open-messaging', handleOpen);
    window.addEventListener('close-messaging', handleClose);
    return () => {
      window.removeEventListener('toggle-messaging', handleToggle);
      window.removeEventListener('open-messaging', handleOpen);
      window.removeEventListener('close-messaging', handleClose);
    };
  }, []);

  const toggleOpen = () => {
    if (!open) {
      window.dispatchEvent(new CustomEvent('close-chatbot'));
    }
    setOpen(!open);
  };

  // Fetch unique shops from booking history
  const { data: bookings = [] } = useQuery({
    queryKey: ['my-bookings-chat', user?.id],
    queryFn: async () => {
      const res = await bookingService.getMyBookings(1, 100);
      return res?.content || [];
    },
    enabled: !!user
  });

  const { data: pastShops = [] } = useQuery({
    queryKey: ['my-conversations', user?.id],
    queryFn: async () => {
        const res = await apiClient.get<ApiResponse<{id: number, shopName: string, lastMessage?: string, unreadCount?: number}[]>>('/chat/my-conversations');
        return res.data.result ?? [];
    },
    enabled: !!user,
    refetchInterval: 5000,
    refetchIntervalInBackground: true
  });

  const totalUnread = pastShops.reduce((sum, s) => sum + Number(s.unreadCount || 0), 0);

  const mergedShopsMap = new Map();
  bookings.forEach(b => mergedShopsMap.set(b.shopId, { id: b.shopId, name: b.shopName }));
  pastShops.forEach(s => mergedShopsMap.set(s.id, { id: s.id, name: s.shopName, lastMessage: s.lastMessage, unreadCount: s.unreadCount }));
  const mergedShops = Array.from(mergedShopsMap.values());

  const adminSupport = { id: 0, name: 'Trung tâm hỗ trợ khách hàng', type: 'ADMIN_SUPPORT' };
  
  const allConversations = [
    adminSupport,
    ...mergedShops
  ];

  if (selectedShop && !allConversations.find(c => c.id === selectedShop.id)) {
    allConversations.push(selectedShop as any);
  }

  const filteredConversations = allConversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const { messages, connected, loading, isTyping, sendMessage, sendTypingEvent } = useShopChat(
    selectedShop?.id ?? null,
    user?.token,
    'CUSTOMER_CHAT',
    user?.email
  );

  if (!user) return null;

  // Nếu đang ở màn hình có hiển thị tin nhắn full (vd admin/shop messages) thì có thể ẩn popup
  if (location.pathname.includes('/messages') || location.pathname.includes('/admin/messages') || location.pathname.includes('/shop/messages')) {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      <button 
        onClick={toggleOpen} 
        className="fixed bottom-[156px] lg:bottom-[100px] right-4 lg:right-5 z-50 group w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-[#1a2b4c] via-indigo-600 to-purple-600 text-white shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110" 
        aria-label="Mo tin nhan"
      >
        <div className="absolute inset-0 rounded-full bg-indigo-500 blur-lg opacity-40 group-hover:opacity-70 transition duration-300 z-0"></div>
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          {open ? (
            <span className="material-symbols-outlined text-[24px] lg:text-[32px]">close</span>
          ) : (
            <span className="material-symbols-outlined text-[24px] lg:text-[32px] drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
          )}
          {totalUnread > 0 && (
            <div className="absolute -top-1 -right-1 z-20 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white shadow-sm border-2 border-white animate-bounce">
              {totalUnread > 99 ? '99+' : totalUnread}
            </div>
          )}
        </div>
      </button>

      {open && (
        <div className="fixed bottom-[156px] lg:bottom-[100px] right-[68px] lg:right-[95px] z-[60] w-[320px] sm:w-[360px] lg:w-[370px] max-w-[calc(100vw-80px)] h-[480px] lg:h-[640px] max-h-[calc(100vh-180px)] lg:max-h-[640px] flex flex-col rounded-3xl shadow-2xl shadow-slate-900/20 overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
          
          {!selectedShop ? (
            // Danh sách hội thoại
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a2b4c] to-indigo-600 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <MessageCircle className="text-white" size={18} />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">Tin nhắn</p>
                    <p className="text-[10px] text-white/80 font-medium">Hỗ trợ & Tư vấn</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    placeholder="Tìm kiếm..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {filteredConversations.map((shop) => (
                  <button 
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-transparent text-left group"
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      shop.id === 0 ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      {shop.id === 0 ? <ShieldCheck size={20} /> : <MessageCircle size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-bold text-sm truncate text-slate-900 dark:text-slate-200 ${(shop as any).unreadCount > 0 ? 'font-black' : ''}`}>
                        {shop.name}
                      </h4>
                      <p className={`text-[11px] truncate mt-0.5 ${(shop as any).unreadCount > 0 ? 'font-bold text-slate-800 dark:text-white' : 'text-slate-500'}`}>
                        {shop.id === 0 ? 'Hỗ trợ trực tuyến 24/7' : ((shop as any).lastMessage || 'Nhấn để nhắn tin')}
                      </p>
                    </div>
                    {(shop as any).unreadCount > 0 && (
                      <div className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                        {(shop as any).unreadCount > 9 ? '9+' : (shop as any).unreadCount}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Khung chat với shop cụ thể
            <div className="flex flex-col h-full bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelectedShop(null)} className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    selectedShop.id === 0 ? 'bg-blue-500 text-white' : 'bg-primary/10 text-primary'
                  }`}>
                    {selectedShop.id === 0 ? <ShieldCheck size={16} /> : <MessageCircle size={16} />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-bold text-sm text-slate-900 dark:text-white truncate max-w-[160px]">{selectedShop.name}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                        {connected ? 'Trực tuyến' : 'Ngoại tuyến'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-hidden relative">
                <ConversationThread
                  messages={messages}
                  loading={loading}
                  currentUserEmail={user?.email}
                  connected={connected}
                  input={input}
                  setInput={setInput}
                  onSendMessage={(msg, attachment) => sendMessage(msg, attachment)}
                  isTyping={isTyping}
                  onTyping={(typing) => sendTypingEvent(typing)}
                  hideHeader={true}
                  placeholder="Nhập tin nhắn..."
                />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
