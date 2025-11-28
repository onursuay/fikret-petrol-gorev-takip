import { useState, useEffect } from 'react';
import { Bell, Volume2, X } from 'lucide-react';
import { enableNotificationSound } from '@/hooks/useNotifications';

export const NotificationPermission = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Ses izni verilmemişse göster
    const hasPermission = localStorage.getItem('notificationSoundEnabled');
    
    console.log('🔍 NotificationPermission check:', { hasPermission });
    
    if (hasPermission !== 'true') {
      // Dashboard yüklendikten sonra göster
      const timer = setTimeout(() => {
        console.log('🎯 Popup gösteriliyor!');
        setShow(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = () => {
    console.log('🔘 Aktif Et butonu tıklandı');
    const success = enableNotificationSound();
    console.log('🎵 Ses aktif edildi mi?', success);
    setShow(false);
  };

  const handleDismiss = () => {
    console.log('❌ Popup kapatıldı');
    localStorage.setItem('notificationSoundDismissed', 'true');
    setShow(false);
  };

  if (!show) {
    console.log('❌ Popup gösterilmiyor');
    return null;
  }

  console.log('✅ Popup render ediliyor!');

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
          <Bell className="w-10 h-10 text-white animate-pulse" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-3">
          🔔 Bildirim Sesi
        </h2>
        
        <p className="text-gray-600 dark:text-gray-300 text-center mb-6 text-base">
          Yeni görev atandığında <strong>sesli bildirim</strong> almak ister misiniz?
        </p>
        
        <button
          onClick={handleEnable}
          className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-3 font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105"
        >
          <Volume2 className="w-6 h-6" />
          Evet, Aktif Et
        </button>
        
        <button
          onClick={handleDismiss}
          className="w-full mt-3 px-6 py-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors text-sm"
        >
          Hayır, teşekkürler
        </button>
      </div>
    </div>
  );
};

export default NotificationPermission;

