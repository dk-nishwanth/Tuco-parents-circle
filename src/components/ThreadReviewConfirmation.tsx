import { Conversation } from '../types';
import { Clock, Mail, MessageCircle } from 'lucide-react';

interface ThreadReviewConfirmationProps {
  threadTitle: string;
  relatedThreads: Conversation[];
  onBrowseRelated: (id: number) => void;
  onClose: () => void;
}

export function ThreadReviewConfirmation({
  threadTitle,
  relatedThreads,
  onBrowseRelated,
  onClose,
}: ThreadReviewConfirmationProps) {
  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 px-6 py-8 text-center border-b border-neutral-200">
          <div className="text-5xl mb-3">⏳</div>
          <h2 className="font-display font-black text-xl text-neutral-800 mb-2">
            Your post is in review
          </h2>
          <p className="text-sm text-neutral-600 font-medium max-w-sm mx-auto">
            <strong>"{threadTitle}"</strong> has been submitted to our moderation team.
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <Clock className="w-5 h-5 text-tuco-orange shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-black text-sm text-neutral-800">Review time</p>
              <p className="text-xs text-neutral-500 mt-1 font-medium">
                Tuco commits to reviewing every new thread within <strong>4–6 hours during working hours</strong>. You'll receive an email notification when your post is approved and goes live.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-neutral-50 rounded-xl p-4 border border-neutral-100">
            <Mail className="w-5 h-5 text-tuco-cyan shrink-0 mt-0.5" />
            <div>
              <p className="font-display font-black text-sm text-neutral-800">Email on approval</p>
              <p className="text-xs text-neutral-500 mt-1 font-medium">
                We'll send a confirmation to your registered email as soon as moderators approve
                your discussion.
              </p>
            </div>
          </div>

          {relatedThreads.length > 0 && (
            <div>
              <p className="font-display font-black text-xs text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" />
                While you wait — related discussions
              </p>
              <div className="space-y-2">
                {relatedThreads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onBrowseRelated(t.id)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-neutral-200 hover:border-tuco-cyan hover:bg-tuco-cyan/5 transition-all"
                  >
                    <p className="font-display font-bold text-xs text-neutral-800 line-clamp-1">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-bold mt-0.5">
                      {t.replies.length} replies · {t.votes} votes
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-xl transition-all"
          >
            Got it — continue browsing
          </button>
        </div>
      </div>
    </div>
  );
}
