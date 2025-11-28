import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useNotifications = (userId: string | undefined) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

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
          // Ses çal - Web Audio API ile
          const playSound = async () => {
            try {
              const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
              
              // Gain node (ses seviyesi kontrolü)
              const gainNode = audioContext.createGain();
              gainNode.connect(audioContext.destination);
              gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
              
              // İki tonlu bildirim sesi
              // İlk ton (yüksek)
              const oscillator1 = audioContext.createOscillator();
              oscillator1.type = 'sine';
              oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
              oscillator1.connect(gainNode);
              oscillator1.start(audioContext.currentTime);
              oscillator1.stop(audioContext.currentTime + 0.1);
              
              // İkinci ton (düşük)
              const oscillator2 = audioContext.createOscillator();
              oscillator2.type = 'sine';
              oscillator2.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
              oscillator2.connect(gainNode);
              oscillator2.start(audioContext.currentTime + 0.1);
              oscillator2.stop(audioContext.currentTime + 0.2);
              
              console.log('✅ Bildirim sesi çalındı');
            } catch (e) {
              console.log('❌ Ses çalınamadı:', e);
            }
          };
          
          playSound();
          
          // Toast göster
          toast.info(`🔔 ${payload.new.title}`, {
            description: payload.new.message,
            duration: 5000,
          });
          
          // State güncelle
          setNotifications(prev => [payload.new, ...prev]);
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

