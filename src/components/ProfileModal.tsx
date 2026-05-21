import { User } from '../types';
import { MemberProfile } from './MemberProfile';
import { X } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  user: User;
  loginEmail?: string;
  loginPassword?: string;
  onClose: () => void;
}

export function ProfileModal({
  isOpen,
  user,
  loginEmail,
  loginPassword,
  onClose,
}: ProfileModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 relative my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors z-10"
          aria-label="Close profile"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="px-2 pt-2 pb-4">
          <h2 className="font-display font-black text-lg text-neutral-800 px-4 pt-4 pb-2">
            Your Profile
          </h2>
          <MemberProfile
            user={user}
            isCurrentUser
            loginEmail={loginEmail}
            loginPassword={loginPassword}
          />
        </div>
      </div>
    </div>
  );
}
