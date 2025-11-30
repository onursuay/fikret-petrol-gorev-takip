import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

let audioContext: AudioContext | null = null;
let isAudioEnabled = false;
let isAudioInitialized = false;

const playNotificationSound = () => {
  if (!isAudioEnabled || !audioContext) return;
  
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    
    const osc1 = audioContext.createOscillator();
    const gain1 = audioContext.createGain();
    osc1.connect(gain1);
    gain1.connect(audioContext.destination);
    osc1.frequency.value = 800;
    osc1.type = 'sine';
    gain1.gain.value = 0.3;
    osc1.start(audioContext.currentTime);
    osc1.stop(audioContext.currentTime + 0.15);
    
    setTimeout(() => {
      if (!audioContext) return;
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.15);
    }, 170);
    
    console.log('🔊 Bildirim sesi çalındı!');
  } catch (e) {
    console.error('Ses hatası:', e);
  }
};

const initAudioOnInteraction = () => {
  if (isAudioInitialized) return;
  
  const enableAudio = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
      isAudioEnabled = true;
      isAudioInitialized = true;
      localStorage.setItem('notificationSoundEnabled', 'true');
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
      console.log('🔔 Ses otomatik aktif edildi');
    } catch (e) {
      console.error('Ses aktif edilemedi:', e);
    }
  };
  
  if (localStorage.getItem('notificationSoundEnabled') === 'true') {
    document.addEventListener('click', enableAudio, { once: true });
    document.addEventListener('touchstart', enableAudio, { once: true });
  }
};

export const enableNotificationSound = () => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    isAudioEnabled = true;
    isAudioInitialized = true;
    localStorage.setItem('notificationSoundEnabled', 'true');
    playNotificationSound();
    return true;
  } catch (e) {
    return false;
  }
};

export const useNotifications = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    initAudioOnInteraction();
  }, []);

  useEffect(() => {
    if (!userId) return;

    const fetchNotifications = async () => {
      // 7 günden eski okunmamış bildirimleri otomatik temizle
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .lt('created_at', sevenDaysAgo.toISOString());

      // Güncel bildirimleri çek
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      console.log('📬 Okunmamış bildirimler:', data);
      console.log('📊 Bildirim sayısı:', data?.length || 0);
      
      setNotifications(data || []);
      setUnreadCount(data?.length || 0);
    };

    fetchNotifications();

    // Realtime dinle
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('🔔 YENİ BİLDİRİM:', payload.new);
          
          const notificationData = payload.new as any;
          
          // Ses çal
          playNotificationSound();
          
          // Toast göster
          toast.info(`🔔 ${notificationData.title}`, {
            description: notificationData.message,
            duration: 5000,
          });
          
          // Push Notification gönder (sayfa arka plandaysa veya kapalıysa)
          if ('Notification' in window && Notification.permission === 'granted') {
            // Eğer sayfa arka plandaysa veya hidden ise
            if (document.hidden) {
              console.log('📢 Push Notification gönderiliyor (sayfa arka planda)');
              new Notification(notificationData.title || '🔔 Yeni Görev', {
                body: notificationData.message || 'Yeni bir görev atandı',
                icon: '/fikret-petrol-logo.png',
                badge: '/fikret-petrol-logo.png',
                tag: 'task-notification',
                requireInteraction: false,
                silent: false
              });
            } else {
              console.log('👀 Sayfa aktif - sadece toast gösteriliyor');
            }
          }
          
          setNotifications(prev => [notificationData, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    setNotifications([]);
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead };
};

