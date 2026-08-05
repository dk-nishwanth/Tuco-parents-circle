import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { CATEGORIES } from '../data/categories';
import { uploadImage } from '../utils/api';
import { Send, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    category: string,
    text: string,
    images: string[]
  ) => void | Promise<void>;
  istucoTeam?: boolean;
}

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function NewPostModal({ isOpen, onClose, onSubmit, istucoTeam }: NewPostModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('skincare');
  const [customCategory, setCustomCategory] = useState('');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close on Escape, matching the X button and backdrop click.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setErrorMsg(`You can attach at most ${MAX_IMAGES} images.`);
      return;
    }
    const picked = files.slice(0, remaining);
    const oversize = picked.filter(f => f.size > MAX_IMAGE_BYTES);
    const okFiles = picked.filter(f => f.size <= MAX_IMAGE_BYTES);
    setUploading(true);
    try {
      // uploadImage tries S3 first (when server-configured), falls back to
      // base64 so posting always works even without S3 credentials.
      const uploaded = await Promise.all(okFiles.map(f => uploadImage(f, 'post')));
      setImages(prev => [...prev, ...uploaded].slice(0, MAX_IMAGES));
      if (oversize.length > 0) {
        setErrorMsg(`Skipped ${oversize.length} image(s) larger than 5MB.`);
      } else if (files.length > remaining) {
        setErrorMsg(`Only the first ${remaining} image(s) were added (max ${MAX_IMAGES}).`);
      } else {
        setErrorMsg('');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return; // guard against double-click/double-Enter firing two creates
    if (!title.trim()) {
      setErrorMsg('Please add a title or question.');
      return;
    }
    const finalCategory = category === 'other' ? (customCategory.trim().toLowerCase().replace(/\s+/g, '-') || 'other') : category;
    setSubmitting(true);
    try {
      await onSubmit(title.trim(), finalCategory, text.trim(), images);
      setTitle('');
      setCategory('skincare');
      setCustomCategory('');
      setText('');
      setImages([]);
      setErrorMsg('');
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[70] overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {}
      <div role="dialog" aria-modal="true" aria-label="Ask a question" className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 text-left my-auto flex flex-col">
        {}
        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-150 flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-neutral-800 flex items-center gap-2">
            ✏️ start a parenting discussion
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
        {}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {istucoTeam && (
            <div className="text-xs bg-orange-50 border border-orange-200 text-orange-800 rounded-xl p-3 font-medium">
              <strong>tuco Team posting rules:</strong> Only post when directly and genuinely relevant
              to tuco products, safety alerts, or community updates. You cannot close threads or remove
              negative feedback.
            </div>
          )}
          <p className="text-[10px] text-neutral-400 font-medium -mt-2">
            Hindi, Hinglish & regional languages are welcome — never removed for language alone.
          </p>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-left">
              Select Discussing Category
            </label>
            <select
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-neutral-700 outline-none font-display font-bold"
              value={category}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => { setCategory(e.target.value); setCustomCategory(''); }}
            >
              {Object.values(CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
              <option value="other">✏️ Other (custom)</option>
            </select>
            {category === 'other' && (
              <div className="mt-2">
                <input
                  type="text"
                  maxLength={40}
                  placeholder="e.g. sleep training, screen time, travel…"
                  className="w-full bg-white border border-tuco-cyan rounded-xl py-2.5 px-3 text-xs sm:text-sm text-neutral-700 outline-none font-sans font-medium placeholder-neutral-400 focus:border-tuco-cyan"
                  value={customCategory}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomCategory(e.target.value)}
                  autoFocus
                />
                <p className="text-[10px] text-neutral-400 mt-1">Your custom category will appear on the post.</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-left">
              Your Discussion Question or Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Any natural shampoo recommendations for kid lice?"
              className="w-full bg-white border border-neutral-200 rounded-xl py-2.5 px-3 text-xs sm:text-sm text-neutral-700 outline-none font-sans font-medium placeholder-neutral-400 focus:border-tuco-cyan"
              value={title}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-700 mb-1.5 text-left">
              Explain Your Dilemma / Experience
            </label>
            <div className="relative">
              <textarea
                rows={4}
                placeholder="Provide context. What has been your child's age, symptom, or situation? Let's help out..."
                className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 pr-10 text-xs sm:text-sm text-neutral-700 outline-none font-sans font-medium focus:border-tuco-cyan"
                value={text}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setText(e.target.value)}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-2">
                <input
                  type="file"
                  id="post-image-upload"
                  className="hidden"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  disabled={images.length >= MAX_IMAGES}
                />
                <label
                  htmlFor="post-image-upload"
                  className={`p-2 rounded-lg text-neutral-400 transition-colors ${
                    images.length >= MAX_IMAGES || uploading
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-neutral-100 hover:text-tuco-cyan cursor-pointer'
                  }`}
                  title={images.length >= MAX_IMAGES ? `Max ${MAX_IMAGES} images` : `Upload images (${images.length}/${MAX_IMAGES})`}
                >
                  {uploading
                    ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                    : <ImageIcon className="w-5 h-5" strokeWidth={1.5} />}
                </label>
              </div>
            </div>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {images.map((src, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={src}
                    alt={`Preview ${idx + 1}`}
                    className="h-24 w-24 object-cover rounded-xl border border-neutral-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-500 hover:text-rose-500 shadow-md transition-colors"
                    aria-label={`Remove image ${idx + 1}`}
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <span className="text-[10px] text-neutral-400 self-end mb-1">
                  {MAX_IMAGES - images.length} more allowed
                </span>
              )}
            </div>
          )}
          {errorMsg && (
            <div className="text-red-600 font-bold text-xs bg-red-50 p-2.5 rounded-lg border border-red-200">
              ⚠️ {errorMsg}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white hover:bg-neutral-50 text-neutral-600 text-xs sm:text-sm font-display font-bold border border-neutral-200 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
                type="submit"
                disabled={uploading || submitting}
                className="flex-1 py-2 bg-tuco-cyan hover:bg-tuco-cyan-hover disabled:bg-tuco-cyan/60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-display font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
              {(uploading || submitting)
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                : <Send className="w-3.5 h-3.5" strokeWidth={1.5} />}
              <span>{uploading ? 'Uploading…' : submitting ? 'Posting…' : 'Launch Thread'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
