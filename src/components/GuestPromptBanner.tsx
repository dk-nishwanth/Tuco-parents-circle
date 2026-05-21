import { useState } from 'react';
import { MessageSquarePlus, X } from 'lucide-react';

const DISMISS_KEY = 'tuco_guest_prompt_dismissed';

interface GuestPromptBannerProps {
  onSignIn: () => void;
  onNewPost: () => void;
}

export function GuestPromptBanner({ onSignIn, onNewPost }: GuestPromptBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });

  if (dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-white border border-tuco-cyan/30 rounded-2xl shadow-lg p-4 flex gap-3 items-start">
        <div className="text-2xl shrink-0">💬</div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-black text-sm text-neutral-800 mb-1">
            Enjoying the discussions?
          </p>
          <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-3">
            You're browsing as a guest. Sign in to reply, vote, and share your own parenting
            experience with the community.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onSignIn}
              className="text-xs bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-2 px-4 rounded-lg transition-all"
            >
              Sign In Free
            </button>
            <button
              onClick={onNewPost}
              className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-display font-bold py-2 px-3 rounded-lg flex items-center gap-1 transition-all"
            >
              <MessageSquarePlus className="w-3 h-3" />
              Ask a Question
            </button>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, 'true');
            setDismissed(true);
          }}
          className="text-neutral-400 hover:text-neutral-600 p-1 shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
