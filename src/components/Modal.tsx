import React, { useState, FormEvent } from 'react';
import { CATEGORIES } from '../data/categories';
import { PRODUCTS } from '../data/products';
import { Conversation, User } from '../types';
import { Heart, MessageSquare, X, Eye, Bookmark, ChevronDown, Search, Bell, ArrowLeft } from 'lucide-react';
import tucoLogo from '../assets/tuco-logo.webp';

interface ModalProps {
  thread: Conversation | null;
  isOpen: boolean;
  onClose: () => void;
  onAddReply: (
    threadId: number,
    name: string,
    city: string,
    text: string,
    image?: string
  ) => void;
  onLikeReply?: (threadId: number, replyId: number) => void;
  onReportReply?: (threadId: number, replyId: number) => void;
  onEditReply?: (threadId: number, replyId: number, newText: string) => void;
  onDeleteReply?: (threadId: number, replyId: number) => void;
  currentUser?: User | null;
  likedReplies?: Record<number, boolean>;
  users?: Record<string, User>;
}
export function Modal({
  thread,
  isOpen,
  onClose,
  onAddReply,
  onLikeReply,
  onReportReply,
  onEditReply,
  onDeleteReply,
  currentUser,
  likedReplies = {},
  users = {},
}: ModalProps) {
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen || !thread) return null;
  
  const category = CATEGORIES[thread.category] || { icon: '💬', label: 'General' };
  
  const getTucoProduct = (recId: string) => {
    return PRODUCTS.find(p => p.id === recId) || null;
  };

  const handleReplySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() && !replyImage) {
      setErrorMessage('Please write some thoughts or upload an image.');
      return;
    }
    onAddReply(
      thread.id,
      currentUser?.username || 'Guest',
      currentUser?.city || 'India',
      replyText.trim(),
      replyImage
    );
    setReplyText('');
    setReplyImage(undefined);
    setErrorMessage('');
  };

  return (
    <div
      className="fixed inset-0 bg-[#F9FAFB] z-[60] overflow-y-auto flex flex-col font-sans"
    >
      {/* App Header */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-neutral-50 rounded-full transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-[#4D4747]" strokeWidth={2} />
            </button>
            <button onClick={onClose} className="hover:opacity-80 transition-opacity">
              <img src={tucoLogo} alt="Tuco" className="h-7 w-auto" />
            </button>
          </div>

          <div className="flex-1 max-w-[440px]">
            <div className="bg-[#F3F4F6] border border-neutral-200 rounded-lg h-9 w-full flex items-center px-4">
              <div className="w-full h-4 bg-transparent" />
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button className="p-1.5 hover:bg-neutral-50 rounded-full transition-colors">
              <Bell className="w-6 h-6 text-neutral-300" strokeWidth={1.5} />
            </button>
            <button className="bg-[#35B5EC] text-white px-5 py-2 rounded-lg text-[14px] font-bold shadow-sm hover:bg-[#2da3d6] transition-colors">
              ask
            </button>
            <div className="w-9 h-9 border-2 border-[#35B5EC] rounded-lg flex items-center justify-center text-[14px] font-bold text-[#35B5EC] ml-1">
              LA
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[680px] mx-auto w-full px-4 py-6">
        {/* Main Post Card */}
        <div className="bg-white border border-neutral-200 rounded-[24px] p-6 mb-4 shadow-sm relative">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-[15px]"
                style={{ backgroundColor: '#D81B60' }}
              >
                TR
              </div>
              <div>
                <h4 className="font-bold text-[15px] text-[#4D4747] leading-none mb-1">
                  {thread.op.author}
                </h4>
                <p className="text-[12px] text-neutral-400 font-medium leading-none">
                  {thread.op.city}
                </p>
              </div>
            </div>
            <span className="text-[12px] text-neutral-400 font-medium">
              1 day ago
            </span>
          </div>

          <h2 className="font-bold text-[21px] text-[#4D4747] leading-[1.25] mb-5 tracking-tight">
            {thread.title}
          </h2>

          <p className="text-[14.5px] text-[#555555] leading-relaxed font-normal mb-8">
            {thread.op.text}
          </p>

          <div className="flex items-center justify-end gap-5 pt-5 border-t border-neutral-100">
            <Bookmark className="w-5 h-5 text-neutral-400 cursor-pointer hover:text-neutral-500 transition-colors" strokeWidth={1.5} />
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Eye className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
              <span className="text-[13px] font-medium">{thread.views || 691} views</span>
            </div>
          </div>
        </div>

        {/* Join conversation Box */}
        <div className="bg-white border border-neutral-200 rounded-[20px] p-5 mb-8 shadow-sm">
          <div className="relative">
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Join the conversation..."
              className="w-full text-[16px] text-neutral-600 placeholder-neutral-300 outline-none resize-none min-h-[45px] font-normal"
            />
            <div className="flex justify-end mt-2">
              <button
                type="submit"
                onClick={handleReplySubmit}
                className="bg-[#35B5EC] hover:bg-[#2da3d6] text-white px-9 py-2.5 rounded-full text-[14px] font-bold transition-all shadow-sm active:scale-95"
              >
                comment
              </button>
            </div>
          </div>
        </div>

        {/* Replies Header */}
        <div className="flex items-center gap-2.5 mb-5 px-1">
          <MessageSquare className="w-5 h-5 text-[#35B5EC]" strokeWidth={2} />
          <span className="font-bold text-[16px] text-[#4D4747]">{thread.replies.length} replies</span>
        </div>

        {/* Replies Controls */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="flex items-center gap-2 px-6 py-2.5 bg-white border border-neutral-200 rounded-full text-[14px] font-medium text-neutral-400 hover:border-neutral-300 transition-all"
            >
              <span>new (default)</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300" strokeWidth={1.5} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="search comments"
              className="w-full pl-12 pr-6 py-2.5 bg-white border border-neutral-200 rounded-full text-[14px] font-normal outline-none focus:border-neutral-300 placeholder-neutral-300 transition-all"
            />
          </div>
        </div>

        {/* Replies List */}
        <div className="space-y-6">
          {thread.replies.map((reply) => {
            const product = reply.tucoRec ? getTucoProduct(reply.tucoRec) : null;
            return (
              <div key={reply.id} className="bg-white border border-neutral-200 rounded-[24px] p-6 shadow-sm">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-[15px]"
                      style={{ backgroundColor: '#D81B60' }}
                    >
                      TR
                    </div>
                    <div>
                      <h4 className="font-bold text-[15px] text-[#4D4747] leading-none mb-1">
                        {reply.author}
                      </h4>
                      <p className="text-[12px] text-neutral-400 font-medium leading-none">
                        {reply.city}
                      </p>
                    </div>
                  </div>
                  <span className="text-[12px] text-neutral-400 font-medium">
                    1 day ago
                  </span>
                </div>

                <p className="text-[14.5px] text-[#4D4747] leading-relaxed font-normal mb-6">
                  {reply.text}
                </p>

                <div className="flex items-center justify-end gap-2 mb-6">
                  <Heart className="w-4 h-4 text-neutral-300" strokeWidth={1.5} />
                  <span className="text-[13px] font-medium text-neutral-400">12 helpful</span>
                </div>

                {product && (
                  <div className="bg-white border border-neutral-100 rounded-[20px] overflow-hidden flex items-stretch shadow-sm">
                    <div className="w-36 bg-[#FEF9C3] flex items-center justify-center p-7 shrink-0">
                      <span className="text-6xl">{product.icon}</span>
                    </div>
                    <div className="flex-1 p-7 flex flex-col justify-center">
                      <h5 className="font-bold text-[18px] text-[#4D4747] leading-snug mb-1">
                        {product.name}
                      </h5>
                      <p className="text-[12px] text-neutral-400 font-medium mb-6">
                        {product.tag}
                      </p>
                      <button className="bg-[#FED018] hover:bg-[#fccb0a] text-neutral-800 px-8 py-2 rounded-full text-[14px] font-bold w-fit transition-colors">
                        add to cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
