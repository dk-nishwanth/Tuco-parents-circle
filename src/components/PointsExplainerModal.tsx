import { useEffect } from 'react';
import { Sparkles, MessageSquare, ThumbsUp, UserPlus, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

// One-time "how tuco Points work" explainer. Shown once per account, right
// after signup/profile completion — see the localStorage gate in App.tsx
// (tuco_points_explainer_seen_<userId>). Points themselves are earned and
// tracked via Nector (see nectorAwardOnce in server/index.ts); this is just
// the first-run explanation of the mechanic, nothing transactional lives here.
// Point amounts themselves are configured on Nector's dashboard (see
// NECTOR_TRIGGER_SIGNUP/POST/REPLY env vars), not in this codebase — so
// deliberately no numbers here, just what earns them.
const EARN_WAYS = [
  { icon: UserPlus, label: 'Signing up' },
  { icon: MessageSquare, label: 'Starting a discussion' },
  { icon: ThumbsUp, label: 'Replying to someone' },
];

export function PointsExplainerModal({ onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-neutral-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-[80]"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 relative"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-6 h-6 text-tuco-cyan" />
          <h2 className="font-display font-black text-lg text-neutral-800">Welcome! Here's how tuco Points work</h2>
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          Every time you take part in the community, you earn tuco Points — redeemable for rewards on tucokids.com.
        </p>
        <ul className="space-y-2.5 mb-4">
          {EARN_WAYS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 bg-neutral-50 border border-neutral-100 rounded-xl px-3 py-2.5">
              <Icon className="w-4 h-4 text-tuco-cyan shrink-0" />
              <span className="flex-1 text-sm font-medium text-neutral-700">{label}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-neutral-500 mb-4">
          Add your phone number in your profile so your points sync with your tucokids.com account.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full bg-tuco-cyan hover:bg-tuco-cyan-hover text-white text-sm font-bold px-4 py-2.5 rounded-lg transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}
