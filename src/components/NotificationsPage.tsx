import { X, Bell, ThumbsUp, MessageSquare, Award, CheckCircle, Trash2 } from 'lucide-react';
import { Notification } from '../types';

interface NotificationsPageProps {
  isOpen: boolean;
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
  onClearAll: () => void;
  onClose: () => void;
  onThreadOpen: (id: number) => void;
}

export function NotificationsPage({
  isOpen,
  notifications,
  onMarkAsRead,
  onClearAll,
  onClose,
  onThreadOpen,
}: NotificationsPageProps) {
  if (!isOpen) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="w-5 h-5 text-tuco-cyan" />;
      case 'like':
        return <ThumbsUp className="w-5 h-5 text-tuco-orange" />;
      case 'badge':
        return <Award className="w-5 h-5 text-purple-600" />;
      case 'system':
        return <Bell className="w-5 h-5 text-neutral-500" />;
    }
  };
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 relative my-auto">
        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-tuco-cyan" />
            <h2 className="font-display font-black text-sm sm:text-base text-neutral-800">
              Notifications
            </h2>
            {notifications.some(n => !n.read) && (
              <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                {notifications.filter(n => !n.read).length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-neutral-400 hover:text-rose-500 p-1.5 transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
              aria-label="Close notifications"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="modal-bd p-4 overflow-y-auto max-h-[70vh]">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) onMarkAsRead(notification.id);
                    if (notification.threadId) {
                      onThreadOpen(notification.threadId);
                      onClose();
                    }
                  }}
                  className={`p-4 rounded-xl border cursor-pointer group ${
                    notification.read
                      ? 'bg-white border-neutral-200 opacity-75'
                      : 'bg-[#FFFAF7] border-tuco-cyan/30 shadow-sm'
                  } hover:shadow-md transition-all relative`}
                >
                  {!notification.read && (
                    <div className="absolute right-4 top-4">
                      <div className="w-2 h-2 bg-tuco-cyan rounded-full animate-pulse"></div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-black text-xs sm:text-sm text-neutral-800">
                        {notification.title}
                      </h3>
                      <p className="font-sans text-xs text-neutral-500 mt-1 leading-relaxed">
                        {notification.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="font-mono text-[10px] text-neutral-400">
                          {notification.time}
                        </p>
                        {!notification.read && (
                          <span className="text-[10px] font-black text-tuco-cyan opacity-0 group-hover:opacity-100 transition-opacity">
                            Mark as read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Bell className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="font-display font-black text-sm text-neutral-600 mb-1">
                No notifications yet
              </h3>
              <p className="font-sans text-xs text-neutral-400">
                You'll receive notifications when someone replies or likes your posts.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
