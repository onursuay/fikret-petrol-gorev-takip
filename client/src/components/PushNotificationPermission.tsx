import { useState, useEffect } from 'react';
import { Bell, BellRing, Volume2, X } from 'lucide-react';
import { enableNotificationSound } from '@/hooks/useNotifications';

export const PushNotificationPermission = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [show, setShow] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => {
    console.log('🚀 PushNotificationPermission component yüklendi');
    
    // Service Worker'ı kaydet
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('✅ Service Worker kaydedildi:', reg);
        })
        .catch(err => {
          console.error('❌ Service Worker hatası:', err);
        });
    } else {
      console.warn('⚠️ Service Worker desteklenmiyor');
    }
    
    // Bildirim izin durumunu kontrol et
    if ('Notification' in window) {
      const currentPermission = Notification.permission;
      setPermission(currentPermission);
      console.log('🔔 Bildirim izni:', currentPermission);
      
      // İzin verilmemişse popup göster
      if (currentPermission === 'default') {
        setTimeout(() => {
          console.log('🎯 Popup gösteriliyor');
          setShow(true);
        }, 1000);
      }
    } else {
      console.warn('⚠️ Notification API desteklenmiyor');
    }
  }, []);

  const requestPermission = async () => {
    console.log('🔘 İzin isteniyor...');
    
    try {
      const result = await Notification.requestPermission();
      console.log('📋 İzin sonucu:', result);
      setPermission(result);
      
      if (result === 'granted') {
        console.log('✅ Bildirim izni verildi!');
        
        // Ses de aktif et
        const soundSuccess = enableNotificationSound();
        setSoundEnabled(soundSuccess);
        console.log('🔊 Ses aktif mi?', soundSuccess);
        
        // Test bildirimi gönder
        new Notification('🎉 Bildirimler Aktif!', {
          body: 'Artık yeni görevlerden anında haberdar olacaksınız.',
          icon: '/fikret-petrol-logo.png',
          badge: '/fikret-petrol-logo.png',
          vibrate: [200, 100, 200]
        });
        
        setShow(false);
      } else if (result === 'denied') {
        console.warn('⛔ Bildirim izni reddedildi');
        alert('Bildirim izni reddedildi. Ayarlardan manuel olarak açabilirsiniz.');
        setShow(false);
      }
    } catch (error) {
      console.error('❌ İzin hatası:', error);
    }
  };

  const handleDismiss = () => {
    console.log('❌ Popup kapatıldı');
    localStorage.setItem('pushNotificationDismissed', 'true');
    setShow(false);
  };

  if (!show || permission !== 'default') {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[99999] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleDismiss();
        }
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md mx-4 shadow-2xl border-4 border-orange-400 relative animate-in fade-in zoom-in duration-300">
        {/* X butonu */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto mb-4 shadow-lg">
          <BellRing className="w-10 h-10 text-white animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-3">
          🔔 Anlık Bildirimler
        </h2>
        
        <div className="text-gray-600 dark:text-gray-300 text-center mb-6 space-y-2">
          <p className="text-base font-medium">
            Yeni görev atandığında <strong>anında</strong> haberdar olun!
          </p>
          <div className="text-sm space-y-1 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
            <p className="flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4 text-orange-600" />
              Sesli bildirim
            </p>
            <p className="flex items-center justify-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              Sistem bildirimi
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (Sayfa kapalıyken bile bildirim alırsınız)
            </p>
          </div>
        </div>
        
        <button
          onClick={requestPermission}
          className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          <BellRing className="w-6 h-6" />
          Bildirimleri Aktif Et
        </button>
        
        <button
          onClick={handleDismiss}
          className="w-full mt-3 px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm"
        >
          Şimdi değil
        </button>
      </div>
    </div>
  );
};

export default PushNotificationPermission;

