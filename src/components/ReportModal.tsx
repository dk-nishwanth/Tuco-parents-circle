import { useState } from 'react';
import { X, Flag } from 'lucide-react';
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, details: string) => void;
  type: 'thread' | 'reply';
}
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or promotion' },
  { value: 'personal_info', label: 'Sharing personal information' },
  { value: 'hate_speech', label: 'Hate speech or harassment' },
  { value: 'medical', label: 'Medical prescription or misinformation' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];
export function ReportModal({ isOpen, onClose, onSubmit, type }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [details, setDetails] = useState<string>('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedReason) {
      onSubmit(selectedReason, details);
      setSelectedReason('');
      setDetails('');
      onClose();
    }
  };
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 relative my-auto">
        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 sticky top-0 z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Flag className="w-5 h-5 text-rose-500" />
            <h2 className="font-display font-black text-sm sm:text-base text-neutral-800">
              Report {type === 'thread' ? 'Thread' : 'Reply'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
            aria-label="Close report"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4">
            <label className="block text-xs font-bold text-neutral-700 mb-2 font-display">
              What's the issue?
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map(reason => (
                <label
                  key={reason.value}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 hover:border-tuco-cyan cursor-pointer transition-all"
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={e => setSelectedReason(e.target.value)}
                    className="w-4 h-4 accent-tuco-cyan"
                  />
                  <span className="text-sm font-medium text-neutral-700">{reason.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mb-5">
            <label className="block text-xs font-bold text-neutral-700 mb-2 font-display">
              Additional details (optional)
            </label>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder="Please provide any additional information to help us understand the issue..."
              className="w-full p-3 border border-neutral-300 rounded-xl text-sm font-sans focus:outline-none focus:ring-2 focus:ring-tuco-cyan focus:border-tuco-cyan"
              rows={4}
            />
          </div>
          <button
            type="submit"
            disabled={!selectedReason}
            className="w-full bg-rose-500 hover:bg-rose-600 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-display font-black text-sm py-3 rounded-xl transition-all"
          >
            Submit Report
          </button>
          <p className="text-xs text-neutral-400 text-center mt-3 font-medium">
            Our moderation team will review this promptly.
          </p>
        </form>
      </div>
    </div>
  );
}
