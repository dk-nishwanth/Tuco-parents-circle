import { X, Bell, ThumbsUp, MessageCircle, Award } from 'lucide-react';
interface Notification {
  id: number;
  type: 'reply' | 'like' | 'badge' | 'system';
  title: string;
  description: string;
  time: string;
  read: boolean;
}
interface NotificationsPageProps {
  isOpen: boolean;
  onClose: () => void;
}
export function NotificationsPage({ isOpen, onClose }: NotificationsPageProps) {
  const notifications: Notification[] = [
    {
      id: 1,
      type: 'reply',
      title: 'New reply to your thread',
      description: 'Someone replied to your thread about sunscreen for sensitive skin.',
      time: '2 hours ago',
      read: false,
    },
    {
      id: 2,
      type: 'like',
      title: 'Your reply was liked',
      description: 'Your helpful reply about haircare tips received 5 likes!',
      time: '5 hours ago',
      read: false,
    },
    {
      id: 3,
      type: 'badge',
      title: 'You earned a badge!',
      description: 'Congratulations! You earned the Community Insider badge.',
      time: '1 day ago',
      read: true,
    },
    {
      id: 4,
      type: 'system',
      title: 'Welcome to Tuco Parents Circle!',
      description: "We're glad you're here. Start engaging with the community.",
      time: '2 days ago',
      read: true,
    },
  ];
  if (!isOpen) return null;
  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'reply':
        return <MessageCircle className="w-5 h-5 text-tuco-cyan" />;
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
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-bd p-4 overflow-y-auto max-h-[70vh]">
          {notifications.length > 0 ? (
            <div className="space-y-3">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-xl border ${
                    notification.read
                      ? 'bg-white border-neutral-200'
                      : 'bg-neutral-50 border-tuco-cyan/30'
                  } hover:shadow-xs transition-all`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-black text-xs sm:text-sm text-neutral-800">
                        {notification.title}
                      </h3>
                      <p className="font-sans text-xs text-neutral-500 mt-1 leading-relaxed">
                        {notification.description}
                      </p>
                      <p className="font-mono text-[10px] text-neutral-400 mt-2">
                        {notification.time}
                      </p>
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
