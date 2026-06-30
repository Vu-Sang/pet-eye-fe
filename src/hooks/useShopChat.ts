import { useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import apiClient from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ApiResponse } from '../types/api';
import type { ChatMessage } from '../services/admin.service';

const WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api').replace(/\/api\/?$/, '/api/ws');

export function useShopChat(
  shopId: number | null, 
  token: string | undefined, 
  channelType: string = 'ADMIN_SUPPORT',
  recipientEmail?: string
) {
  const { user } = useAuth();
  const currentEmail = user?.email;
  const userRole = user?.role;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState<{ typing: boolean, senderEmail?: string }>({ typing: false });
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    console.log(`useShopChat [${channelType}] initialized. ShopId:`, shopId, "Role:", userRole);
  }, [shopId, channelType, !!token, userRole]);

  // Load history
  useEffect(() => {
    if (shopId === null) return;
    
    let active = true;
    setMessages([]);
    setLoading(true);

    const isCustomer = userRole === 'USER';
    const lowerRecipient = recipientEmail?.toLowerCase();
    const historyRecipient = isCustomer ? undefined : lowerRecipient;

    console.log(`useShopChat: Fetching history for shopId ${shopId}, channelType ${channelType}, recipient:`, historyRecipient);
    apiClient.get<ApiResponse<ChatMessage[]>>(`/chat/${shopId}/history`, {
      params: { channelType, recipientEmail: historyRecipient }
    })
      .then(r => {
        if (active) {
            setMessages(r.data.result ?? []);
            setLoading(false);
        }
      })
      .catch((err) => {
        console.error('useShopChat: Failed to fetch chat history:', err);
        if (active) setLoading(false);
      });

    apiClient.patch(`/chat/${shopId}/read`, null, {
      params: { channelType, recipientEmail: historyRecipient }
    }).catch(() => {});

    return () => {
        active = false;
    };
  }, [shopId, channelType, recipientEmail, userRole]);

  // WebSocket
  useEffect(() => {
    console.log('useShopChat: WebSocket useEffect triggered. Token value:', token ? (token.substring(0, 10) + '...') : token);
    if (!token) {
      console.warn('useShopChat: Token is missing! Skipping WebSocket activation.');
      return;
    }

    console.log('useShopChat: Activating WebSocket client for URL:', WS_URL);
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      onConnect: () => {
        console.log('useShopChat: WebSocket connection established!');
        setConnected(true);
      },
      onDisconnect: () => {
        console.log('useShopChat: WebSocket connection disconnected.');
        setConnected(false);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      console.log('useShopChat: Deactivating WebSocket client.');
      client.deactivate();
    };
  }, [token]);

  // Subscribe
  useEffect(() => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;

    const lowerRecipient = recipientEmail?.toLowerCase();
    const lowerCurrent = currentEmail?.toLowerCase();
    const isCustomer = userRole === 'USER';
    const chatEmail = isCustomer ? lowerCurrent : lowerRecipient;

    // Define all topic candidates to subscribe to for troubleshooting
    const topics: string[] = [];

    if (channelType === 'CUSTOMER_CHAT') {
      topics.push(`/topic/chat/${shopId}/customer/${chatEmail}`);
    } else if (channelType === 'CAMERA_CHAT') {
      // Subscribe to multiple possibilities to detect the correct backend route
      topics.push(`/topic/chat/${shopId}/camera/${chatEmail}`);
      topics.push(`/topic/chat/${shopId}/CAMERA_CHAT/${chatEmail}`);
      topics.push(`/topic/chat/${shopId}/camera`);
      topics.push(`/topic/chat/${shopId}/CAMERA_CHAT`);
    } else if (channelType === 'DIRECT') {
      // 1-1 chat. Identifier is the staff's email.
      const staffEmail = userRole === 'SHOP_OWNER' ? lowerRecipient : lowerCurrent;
      topics.push(`/topic/chat/${shopId}/direct/${staffEmail}`);
    } else {
      topics.push(`/topic/chat/${shopId}/${channelType}`);
    }
      
    console.log(`useShopChat: Subscribing to topic candidates:`, topics);
    const subscriptions = topics.map(topic => {
      return client.subscribe(topic, (frame) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body);
          console.log(`useShopChat: Received message from WebSocket topic [${topic}]:`, msg);
          
          // Deduplicate: skip if we already have an optimistic message with same content+sender within 10s
          setMessages(prev => {
            const dominated = prev.some(p =>
              (p as any)._optimistic &&
              p.content === msg.content &&
              p.senderEmail?.toLowerCase() === msg.senderEmail?.toLowerCase() &&
              Math.abs(new Date(p.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 10000
            );
            if (dominated) {
              console.log('useShopChat: Replacing optimistic message with server message:', msg.id);
              return prev.map(p =>
                (p as any)._optimistic &&
                p.content === msg.content &&
                p.senderEmail?.toLowerCase() === msg.senderEmail?.toLowerCase()
                  ? msg : p
              );
            }
            return [...prev, msg];
          });
        } catch (err) {
          console.error(`useShopChat: Error parsing WebSocket message from [${topic}]:`, err);
        }
      });
    });

    // Subscribing to typing topics as well
    const typingTopics = topics.map(t => t.replace(`/topic/chat/${shopId}/`, `/topic/chat/${shopId}/typing/`));
    console.log(`useShopChat: Subscribing to typing topic candidates:`, typingTopics);
    const typingSubscriptions = typingTopics.map(typingTopic => {
      return client.subscribe(typingTopic, (frame) => {
        try {
          const data = JSON.parse(frame.body);
          if (data.senderEmail?.toLowerCase() !== lowerCurrent) {
            setIsTyping({ typing: data.isTyping, senderEmail: data.senderEmail });
          }
        } catch (err) {}
      });
    });

    return () => {
        console.log('useShopChat: Unsubscribing from all candidates.');
        subscriptions.forEach(sub => sub.unsubscribe());
        typingSubscriptions.forEach(sub => sub.unsubscribe());
        setIsTyping({ typing: false });
    };
  }, [connected, shopId, channelType, recipientEmail, currentEmail, userRole]);

  const sendMessage = useCallback((content: string, attachment?: { url: string; type: string; name: string }) => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;

    // Optimistic update: show message immediately in the UI
    const optimisticMsg: ChatMessage = {
      id: -Date.now(), // temporary negative id
      shopId,
      senderEmail: currentEmail || '',
      senderRole: userRole || 'USER',
      content,
      attachmentUrl: attachment?.url,
      attachmentType: attachment?.type,
      attachmentName: attachment?.name,
      createdAt: new Date().toISOString(),
      isRead: false,
    };
    (optimisticMsg as any)._optimistic = true;
    setMessages(prev => [...prev, optimisticMsg]);

    const isCustomer = userRole === 'USER';
    const sendRecipient = isCustomer ? undefined : recipientEmail?.toLowerCase();

    client.publish({
      destination: '/app/chat',
      body: JSON.stringify({ 
        shopId, 
        channelType,
        recipientEmail: sendRecipient,
        content,
        attachmentUrl: attachment?.url,
        attachmentType: attachment?.type,
        attachmentName: attachment?.name,
      }),
    });
  }, [connected, shopId, channelType, recipientEmail, currentEmail, userRole]);

  const sendTypingEvent = useCallback((typing: boolean) => {
    const client = clientRef.current;
    if (!client || !connected || shopId === null) return;
    const isCustomer = userRole === 'USER';
    const sendRecipient = isCustomer ? undefined : recipientEmail?.toLowerCase();
    client.publish({
      destination: '/app/chat/typing',
      body: JSON.stringify({ shopId, channelType, recipientEmail: sendRecipient, content: typing ? 'true' : 'false' }),
    });
  }, [connected, shopId, channelType, recipientEmail, userRole]);

  return { messages, connected, loading, isTyping, sendMessage, sendTypingEvent };
}
