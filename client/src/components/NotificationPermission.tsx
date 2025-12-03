import { useState, useEffect } from 'react';
import { Bell, Volume2 } from 'lucide-react';

interface Props {
  onEnable?: () => void;
}

export const NotificationPermission = ({ onEnable }: Props) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // localStorage kontrolü
    const enabled = localStorage.getItem('notificationSoundEnabled');
    if (!enabled) {
      // 1 saniye bekle sonra göster (sayfa yüklensin)
      const timer = setTimeout(() => setShow(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = () => {
    localStorage.setItem('notificationSoundEnabled', 'true');
    
    // Ses sistemini aktif et
    if (onEnable) {
      onEnable();
    }
    
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
    // Daha sonra'ya basarsa 1 saat sonra tekrar sor
    localStorage.setItem('notificationDismissedAt', Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mx-auto mb-4">
          <Bell className="w-8 h-8 text-orange-500" />
        </div>
        
        <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
          Bildirim Sesi
        </h2>
        
        <p className="text-gray-600 text-center mb-6">
          Yeni görev atandığında sesli uyarı almak için bildirimleri aktif edin.
        </p>
        
        <div className="flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Daha Sonra
          </button>
          <button
            onClick={handleEnable}
            className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 font-medium"
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








