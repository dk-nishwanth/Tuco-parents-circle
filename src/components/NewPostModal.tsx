import React, { useState, ChangeEvent, FormEvent } from 'react';
import { CATEGORIES } from '../data/categories';
import { Send, X, Image as ImageIcon } from 'lucide-react';

interface NewPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    title: string,
    category: string,
    text: string,
    image?: string
  ) => void;
  istucoTeam?: boolean;
}
export function NewPostModal({ isOpen, onClose, onSubmit, istucoTeam }: NewPostModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('skincare');
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('Image size should be less than 5MB');
        setImage(undefined);
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        e.target.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Please specify a title or question.');
      return;
    }
    if (!text.trim() && !image) {
      setErrorMsg('Please write an explanation or upload an image.');
      return;
    }
    onSubmit(title.trim(), category, text.trim(), image);
    setTitle('');
    setCategory('skincare');
    setText('');
    setImage(undefined);
    setErrorMsg('');
  };
  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[70] overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {}
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-xl overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 text-left my-auto flex flex-col">
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
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setCategory(e.target.value)}
            >
              {Object.values(CATEGORIES).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
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
                required={!image}
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
                  onChange={handleImageChange}
                />
                <label
                  htmlFor="post-image-upload"
                  className="p-2 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-tuco-cyan cursor-pointer transition-colors"
                  title="Upload image"
                >
                  <ImageIcon className="w-5 h-5" strokeWidth={1.5} />
                </label>
              </div>
            </div>
          </div>
          {image && (
            <div className="relative inline-block mt-2">
              <img
                src={image}
                alt="Preview"
                className="max-h-40 rounded-xl border border-neutral-200"
              />
              <button
                type="button"
                onClick={() => setImage(undefined)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-neutral-200 rounded-full flex items-center justify-center text-neutral-500 hover:text-rose-500 shadow-md transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
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
                className="flex-1 py-2 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white text-xs sm:text-sm font-display font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-98 transition-all"
              >
              <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Launch Thread</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
