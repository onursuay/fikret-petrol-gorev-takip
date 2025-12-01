import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// Global audio element - sayfa boyunca aynı kalır
let globalAudio: HTMLAudioElement | null = null;
let isAudioUnlocked = false;

// Sesi başlat (bir kez çağrılır)
const initAudio = () => {
  if (!globalAudio) {
    globalAudio = new Audio('/notification.mp3');
    globalAudio.volume = 1.0;
    globalAudio.load();
  }
};

// Sesi çal
const playNotificationSound = () => {
  if (!globalAudio || !isAudioUnlocked) {
    console.log('🔇 Ses henüz aktif değil');
    return;
  }
  
  globalAudio.currentTime = 0;
  globalAudio.play()
    .then(() => console.log('🔊 Ses çalındı!'))
    .catch(err => console.log('Ses hatası:', err));
};

// Kullanıcı etkileşiminde sesi aç
const unlockAudio = () => {
  if (isAudioUnlocked) return;
  
  initAudio();
  if (globalAudio) {
    // Sessiz çal ve durdur - bu tarayıcı kilidini açar
    globalAudio.volume = 0;
    globalAudio.play()
      .then(() => {
        globalAudio!.pause();
        globalAudio!.currentTime = 0;
        globalAudio!.volume = 1.0;
        isAudioUnlocked = true;
        console.log('✅ Ses sistemi aktif');
      })
      .catch(() => {});
  }
};

// Document click listener - bir kez ekle
if (typeof window !== 'undefined') {
  const handleFirstInteraction = () => {
    unlockAudio();
    // Listener'ı kaldırma - her tıklamada kontrol et
  };
  
  document.addEventListener('click', handleFirstInteraction);
  document.addEventListener('touchstart', handleFirstInteraction);
  document.addEventListener('keydown', handleFirstInteraction);
}

export const useNotifications = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const lastCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const channelRef = useRef<any>(null);

  // Bildirimleri çek
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Bildirim çekme hatası:', error);
        return;
      }

      const newCount = data?.length || 0;
      
      console.log('📬 Bildirimler:', newCount, 'Önceki:', lastCountRef.current, 'İlk yükleme:', isFirstLoadRef.current);

      // İLK YÜKLEME: Okunmamış bildirim varsa ve ses aktifse çal
      if (isFirstLoadRef.current && newCount > 0) {
        const soundEnabled = localStorage.getItem('notificationSoundEnabled');
        if (soundEnabled === 'true') {
          console.log('🔔 Giriş yapıldı, okunmamış bildirim var, ses çalınıyor...');
          // Kısa gecikme - sayfanın tam yüklenmesi için
          setTimeout(() => {
            playNotificationSound();
            toast.info(`🔔 ${newCount} okunmamış bildiriminiz var`, {
              duration: 5000,
            });
          }, 1000);
        }
      }
      
      // SONRAKI KONTROLLER: Yeni bildirim geldiyse çal
      if (!isFirstLoadRef.current && newCount > lastCountRef.current) {
        const diff = newCount - lastCountRef.current;
        console.log(`🔔 ${diff} yeni bildirim!`);
        
        playNotificationSound();
        
        if (data && data.length > 0) {
          const newest = data[0];
          toast.info(`🔔 ${newest.title}`, {
            description: newest.message,
            duration: 5000,
          });
        }
      }

      isFirstLoadRef.current = false;
      lastCountRef.current = newCount;
      setNotifications(data || []);
      setUnreadCount(newCount);
    } catch (err) {
      console.error('Bildirim hatası:', err);
    }
  }, [userId]);

  // Realtime + Polling
  useEffect(() => {
    if (!userId) return;

    initAudio();
    
    // İlk yükleme
    fetchNotifications();

    // Realtime subscription
    const setupRealtime = async () => {
      try {
        // Mevcut session'ı al
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log('⚠️ Auth session yok, sadece polling kullanılacak');
          return;
        }

        console.log('📡 Realtime bağlantısı kuruluyor...');
        
        channelRef.current = supabase
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
              console.log('🔔 Realtime bildirim:', payload.new);
              
              // Ses çal
              playNotificationSound();
              
              // Toast göster
              const newNotif = payload.new as any;
              toast.info(`🔔 ${newNotif.title}`, {
                description: newNotif.message,
                duration: 5000,
              });
              
              // State güncelle
              setNotifications(prev => [newNotif, ...prev]);
              setUnreadCount(prev => prev + 1);
              lastCountRef.current += 1;
            }
          )
          .subscribe((status) => {
            console.log('📡 Realtime status:', status);
          });
      } catch (err) {
        console.error('Realtime hatası:', err);
      }
    };

    setupRealtime();

    // Polling - her 10 saniyede kontrol (fallback)
    const pollInterval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, fetchNotifications]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
    lastCountRef.current = Math.max(0, lastCountRef.current - 1);
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
    lastCountRef.current = 0;
  };

  const enableSound = useCallback(() => {
    unlockAudio();
    // Test sesi çal
    setTimeout(() => {
      if (isAudioUnlocked && globalAudio) {
        globalAudio.currentTime = 0;
        globalAudio.play().catch(() => {});
      }
    }, 100);
  }, []);

  return { notifications, unreadCount, markAsRead, markAllAsRead, enableSound };
};

export default useNotifications;
