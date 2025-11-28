import { useState, useRef, useEffect } from 'react';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import { useNotifications, enableNotificationSound } from '@/hooks/useNotifications';

interface NotificationBellProps {
  userId: string | undefined;
}

export const NotificationBell = ({ userId }: NotificationBellProps) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Dropdown pozisyonunu hesapla
  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right
      });
    }
  }, [open]);

  const handleBellClick = () => {
    if (!soundEnabled) {
      const enabled = enableNotificationSound();
      setSoundEnabled(enabled);
    }
    setOpen(!open);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        ref={buttonRef}
        onClick={handleBellClick} 
        className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-6 h-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div 
          className="fixed w-80 bg-white rounded-lg shadow-2xl border z-[9999]"
          style={{
            top: `${dropdownPosition.top}px`,
            right: `${dropdownPosition.right}px`,
          }}
        >
          <div className="p-3 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
            <span className="font-semibold text-gray-800">Bildirimler</span>
            {unreadCount > 0 && (
              <button 
                onClick={() => {
                  markAllAsRead();
                  setOpen(false);
                }} 
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Tümünü okundu işaretle
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Bildirim yok</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className="p-3 border-b hover:bg-gray-50 cursor-pointer bg-blue-50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-800">{n.title}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleString('tr-TR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

