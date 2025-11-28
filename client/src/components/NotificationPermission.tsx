import { useState, useEffect } from 'react';
import { Bell, Volume2 } from 'lucide-react';
import { enableNotificationSound } from '@/hooks/useNotifications';

export const NotificationPermission = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Daha önce izin verilmemişse ve dismiss edilmemişse göster
    const hasPermission = localStorage.getItem('notificationSoundEnabled');
    const wasDismissed = sessionStorage.getItem('notificationDismissed');
    
    if (!hasPermission && !wasDismissed) {
      // Kısa bir gecikme ile göster (dashboard render edildikten sonra)
      setTimeout(() => setShow(true), 500);
    }
  }, []);

  const handleEnable = () => {
    const success = enableNotificationSound();
    if (success) {
      console.log('✅ Bildirim sesi aktif edildi!');
    }
    setShow(false);
  };

  const handleDismiss = () => {
    // Session boyunca bir daha gösterme
    sessionStorage.setItem('notificationDismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl border-2 border-orange-200">
        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
          <Bell className="w-8 h-8 text-orange-500" />
        </div>
        
        <h2 className="text-xl font-bold text-center text-gray-800 dark:text-white mb-2">
          🔔 Bildirimleri Aktif Et
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
          Yeni görev atandığında sesli bildirim almak için bildirimleri aktif edin.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Daha Sonra
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 font-bold shadow-lg"
          >
            <Volume2 className="w-5 h-5" />
            Aktif Et
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermission;

