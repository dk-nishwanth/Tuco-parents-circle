import React, { useState, ChangeEvent, FormEvent } from 'react';
import { CATEGORIES, CATEGORY_COLORS } from '../data/categories';
import { PRODUCTS } from '../data/products';
import { Conversation, User } from '../types';
import { getAvatarColor, getInitials, getAuthorMeta } from '../utils/helpers';
import { AuthorBadges } from './AuthorBadges';
import { Heart, MessageSquare, Send, ShoppingBag, X } from 'lucide-react';

interface ModalProps {
  thread: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReply: (threadId: number, name: string, city: string, text: string) => void;
  onLikeReply?: (threadId: number, replyId: number) => void;
  onReportReply?: (threadId: number, replyId: number) => void;
  onEditReply?: (threadId: number, replyId: number, newText: string) => void;
  onDeleteReply?: (threadId: number, replyId: number) => void;
  currentUser?: User | null;
  users?: Record<string, User>;
}

export function Modal({ thread, isOpen, onClose, onAddReply, onLikeReply, onReportReply, onEditReply, onDeleteReply, currentUser, users = {} }: ModalProps) {
  const [replyName, setReplyName] = useState(currentUser?.username || '');
  const [replyCity, setReplyCity] = useState(currentUser?.city || '');
  const [replyText, setReplyText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');

  if (!isOpen || !thread) return null;

  const opMeta = getAuthorMeta(thread.op.author, thread.authorId, users);
  const opRole = thread.op.authorRole ?? opMeta.role;
  const opBadges = thread.op.authorBadges ?? opMeta.badges;

  const category = CATEGORIES[thread.category] || { icon: '💬', label: 'General' };
  const catColor = CATEGORY_COLORS[thread.category] || { bg: '#FFF0E8', text: '#D84315', border: '#FFD8C2' };

  // Detect which Tuco product matches the keywords in replies
  const getTucoProduct = (recId: string) => {
    return PRODUCTS.find((p) => p.id === recId) || null;
  };

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!replyName.trim()) {
      setErrorMessage('Please provide your name or pen-name.');
      return;
    }
    if (!replyCity.trim()) {
      setErrorMessage('Please state your city (e.g. Pune, Delhi).');
      return;
    }
    if (!replyText.trim()) {
      setErrorMessage('Please write some thoughts/advice.');
      return;
    }

    onAddReply(thread.id, replyName.trim(), replyCity.trim(), replyText.trim());

    // Reset input fields
    setReplyText('');
    setErrorMessage('');
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 overflow-y-auto"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Modal Container */}
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-3xl overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 text-left my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-neutral-50 px-5 py-4 border-b border-neutral-200 sticky top-0 z-10 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <span
              className="cbadge font-display font-black text-[9px] tracking-wider uppercase py-0.5 px-2.5 rounded-full border border-neutral-200 inline-block"
              style={{ backgroundColor: catColor.bg, color: catColor.text, borderColor: catColor.border }}
            >
              {category.icon} {category.label}
            </span>
            <h2 className="font-display font-black text-sm sm:text-base text-neutral-800 leading-snug mt-1.5 line-clamp-2">
              {thread.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-bd p-5 overflow-y-auto space-y-5 flex-1">
          {/* Original Post container */}
          <div className="op bg-neutral-50/70 border border-neutral-200/80 rounded-2xl p-4 md:p-5 relative">
            <div className="absolute top-2.5 right-2.5 font-sans font-black text-[8px] bg-neutral-200 text-neutral-600 uppercase tracking-widest py-0.5 px-2 rounded-sm">
              ORIGINAL QUESTION
            </div>
            
            <div className="post-auth flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center font-display font-black text-xs text-white border border-white"
                style={{ backgroundColor: getAvatarColor(thread.op.author) }}
              >
                {getInitials(thread.op.author)}
              </div>
              <div>
                <div className="font-display font-black text-xs sm:text-sm text-neutral-800 flex items-center gap-1.5">
                  {thread.op.author}
                  <AuthorBadges badges={opBadges} role={opRole} compact={false} />
                </div>
                <div className="font-sans text-[11px] text-neutral-400 font-bold flex items-center gap-2">
                  <span>{thread.op.city}</span>
                  <span>•</span>
                  <span>{thread.op.time}</span>
                </div>
              </div>
            </div>
            <p className="post-txt font-sans text-xs sm:text-sm text-neutral-600 leading-relaxed font-semibold whitespace-pre-wrap">
              {thread.op.text}
            </p>
          </div>

          {/* Replies count */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h4 className="font-display font-black text-xs sm:text-sm text-neutral-800 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-tuco-cyan" />
              <span>{thread.replies.length} Member Answers</span>
            </h4>
          </div>

          {/* Replies list */}
          <div className="space-y-3.5">
            {thread.replies.map((reply, idx) => {
              const replyMeta = getAuthorMeta(reply.author, undefined, users);
              const replyRole = reply.authorRole ?? replyMeta.role;
              const replyBadges = reply.authorBadges ?? replyMeta.badges;
              return (
              <div
                key={reply.id}
                className={`flex gap-3 sm:gap-4 p-4 rounded-2xl border border-neutral-200 ${
                  idx % 2 === 0 ? 'bg-[#FFFAF7]' : 'bg-white'
                } hover:shadow-xs transition-all`}
              >
                <div
                  className="w-8.5 h-8.5 rounded-full flex items-center justify-center font-display font-black text-[11px] text-white border border-white shrink-0"
                  style={{ backgroundColor: getAvatarColor(reply.author) }}
                >
                  {getInitials(reply.author)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-display font-black text-xs sm:text-sm text-neutral-800 flex items-center gap-1">
                        {reply.author}
                        <AuthorBadges badges={replyBadges} role={replyRole} />
                      </span>
                      <span className="text-[9px] bg-neutral-100 border border-neutral-200/50 font-bold text-neutral-500 rounded-md py-0.5 px-1.5 font-mono">
                        {reply.city}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] font-bold text-neutral-400">
                      {reply.time}
                    </span>
                  </div>

                  <p className="font-sans text-xs sm:text-sm text-neutral-650 leading-relaxed font-semibold whitespace-pre-wrap mt-1">
                    {reply.text}
                  </p>

                  {/* Tuco Rec Product block if included */}
                  {reply.tucoRec && (() => {
                    const product = getTucoProduct(reply.tucoRec);
                    if (!product) return null;
                    return (
                      <div className="mt-3.5 bg-gradient-to-br from-neutral-50 to-white border border-dashed border-tuco-cyan/35 hover:border-tuco-cyan rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-colors max-w-xl">
                        <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                          {product.icon}
                        </div>
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 pb-1">
                            <span className="font-display text-[8px] font-black uppercase text-tuco-orange tracking-wider bg-[#FFF5F0] border border-tuco-orange/15 px-1.5 py-0.5 rounded-sm">
                              🌿 RECOMMENDED PICKS
                            </span>
                            <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 rounded-sm">
                              {product.tag}
                            </span>
                          </div>
                          <h5 className="font-display font-black text-xs text-neutral-800 leading-snug">
                            {product.name}
                          </h5>
                          <p className="font-sans text-[10px] text-neutral-400 font-bold leading-normal">
                            All-natural, safe defense for child’s sensitive skin.
                          </p>
                        </div>
                        <div className="shrink-0 flex sm:flex-col items-center gap-2">
                          <span className="font-mono font-black text-xs text-tuco-orange">
                            {product.price}
                          </span>
                          <a
                            href={product.linkUrl}
                            target="_blank"
                            rel="referrer noopener"
                            className="text-[11px] bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-1 px-4 rounded-full shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Shop Now</span>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {editingReplyId === reply.id ? (
                    <div className="mt-3">
                      <textarea
                        value={editReplyText}
                        onChange={(e) => setEditReplyText(e.target.value)}
                        className="w-full p-3 border border-neutral-300 rounded-xl text-xs sm:text-sm font-sans focus:outline-none focus:ring-2 focus:ring-tuco-cyan focus:border-tuco-cyan"
                        rows={4}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => {
                            if (editReplyText.trim() && onEditReply && thread) {
                              onEditReply(thread.id, reply.id, editReplyText.trim());
                            }
                            setEditingReplyId(null);
                            setEditReplyText('');
                          }}
                          className="text-xs bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-1.5 px-3 rounded-full cursor-pointer transition-all"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingReplyId(null);
                            setEditReplyText('');
                          }}
                          className="text-xs bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-display font-black py-1.5 px-3 rounded-full cursor-pointer transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="font-sans text-xs sm:text-sm text-neutral-650 leading-relaxed font-semibold whitespace-pre-wrap mt-1">
                      {reply.text}
                    </p>
                  )}

                  {/* Tuco Rec Product block if included */}
                  {!editingReplyId && reply.tucoRec && (() => {
                    const product = getTucoProduct(reply.tucoRec);
                    if (!product) return null;
                    return (
                      <div className="mt-3.5 bg-gradient-to-br from-neutral-50 to-white border border-dashed border-tuco-cyan/35 hover:border-tuco-cyan rounded-2xl p-3 md:p-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-colors max-w-xl">
                        <div className="w-11 h-11 rounded-xl bg-white border border-neutral-200 flex items-center justify-center text-xl shrink-0 shadow-xs">
                          {product.icon}
                        </div>
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <div className="flex items-center justify-center sm:justify-start gap-1 pb-1">
                            <span className="font-display text-[8px] font-black uppercase text-tuco-orange tracking-wider bg-[#FFF5F0] border border-tuco-orange/15 px-1.5 py-0.5 rounded-sm">
                              🌿 RECOMMENDED PICKS
                            </span>
                            <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 rounded-sm">
                              {product.tag}
                            </span>
                          </div>
                          <h5 className="font-display font-black text-xs text-neutral-800 leading-snug">
                            {product.name}
                          </h5>
                          <p className="font-sans text-[10px] text-neutral-400 font-bold leading-normal">
                            All-natural, safe defense for child’s sensitive skin.
                          </p>
                        </div>
                        <div className="shrink-0 flex sm:flex-col items-center gap-2">
                          <span className="font-mono font-black text-xs text-tuco-orange">
                            {product.price}
                          </span>
                          <a
                            href={product.linkUrl}
                            target="_blank"
                            rel="referrer noopener"
                            className="text-[11px] bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black py-1 px-4 rounded-full shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                          >
                            <ShoppingBag className="w-3 h-3" />
                            <span>Shop Now</span>
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Feedback like button inside reply footer */}
                  {!editingReplyId && (
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-neutral-100 flex-wrap">
                      <button
                        onClick={() => onLikeReply && onLikeReply(thread.id, reply.id)}
                        className="text-[10px] font-bold font-sans text-neutral-400 hover:text-tuco-cyan flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 fill-rose-100" />
                        <span>{reply.likes || 0} Helpful</span>
                      </button>
                      <span className="text-xs text-neutral-200">|</span>
                      {(currentUser?.username === reply.author || currentUser?.role === 'moderator' || currentUser?.role === 'tuco_team') && (
                        <>
                          <button
                            onClick={() => {
                              setEditingReplyId(reply.id);
                              setEditReplyText(reply.text);
                            }}
                            className="text-[10px] font-bold font-sans text-neutral-400 hover:text-tuco-cyan transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          <span className="text-xs text-neutral-200">|</span>
                          <button
                            onClick={() => {
                              if (onDeleteReply && thread) {
                                onDeleteReply(thread.id, reply.id);
                              }
                            }}
                            className="text-[10px] font-bold font-sans text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            Delete
                          </button>
                          <span className="text-xs text-neutral-200">|</span>
                        </>
                      )}
                      <button
                        onClick={() => {
                          if (onReportReply && thread) {
                            onReportReply(thread.id, reply.id);
                          }
                        }}
                        className="text-[10px] font-bold font-sans text-neutral-350 hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        Report
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
            })}
          </div>

          {/* Reply Form Section */}
          <div className="reply-box-wrap bg-neutral-50/70 border border-neutral-200 rounded-2xl p-4 sm:p-5 mt-4">
            <h4 className="font-display font-black text-xs sm:text-sm text-neutral-800 mb-2.5">
              🗣️ share your experience
            </h4>
            
            <form onSubmit={handleReplySubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 text-left">
                    Your Username / Pen-Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HappyMom_99"
                    className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-neutral-700 outline-none font-sans font-semibold placeholder-neutral-400 focus:border-tuco-cyan"
                    value={replyName}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setReplyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 text-left">
                    Your City
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pune, Bangalore"
                    className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-neutral-700 outline-none font-sans font-semibold placeholder-neutral-400 focus:border-tuco-cyan"
                    value={replyCity}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setReplyCity(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-neutral-500 mb-1.5 text-left">
                  Your Answer/Advice
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Share what worked for your kid. Maintain clean organic safety standards..."
                  className="w-full bg-white border border-neutral-200 rounded-xl py-2 px-3 text-xs text-neutral-700 outline-none font-sans font-semibold placeholder-neutral-400 focus:border-tuco-cyan"
                  value={replyText}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReplyText(e.target.value)}
                />
              </div>

              {errorMessage && (
                <div className="text-red-600 font-bold text-xs bg-red-50 p-2.5 rounded-lg border border-red-200">
                  ⚠️ {errorMessage}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white text-xs sm:text-sm font-display font-black rounded-xl cursor-pointer select-none shadow-xs active:scale-98 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit My Answer</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
