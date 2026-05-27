import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { api } from '../utils/api';
import { getFallbackResponse } from '../utils/chatbotFallback';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am your Tuco Parenting Assistant. How can I help you today?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Initial health check
    api.checkHealth().then(isHealthy => {
      setIsOffline(!isHealthy);
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // If we already know we're offline, use fallback immediately to save time
    if (isOffline) {
      setTimeout(() => {
        const reply = getFallbackResponse(userMessage.content);
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const response = await api.chat([...messages, userMessage]);
      if (response && response.trim()) {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
      } else {
        throw new Error('Empty response from API');
      }
    } catch (error) {
      console.error('ChatBot Backend Error:', error);
      setIsOffline(true); // Mark as offline for subsequent messages
      
      // Use the robust local logic to ensure the bot always replies even if API is down
      const reply = getFallbackResponse(userMessage.content);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute bottom-20 right-0 w-[90vw] sm:w-[400px] h-[600px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-tuco-cyan to-tuco-cyan-hover p-5 flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
                >
                  <Bot className="w-6 h-6 text-white" strokeWidth={1.5} />
                </motion.div>
                <div>
                  <h3 className="font-display font-black text-base text-white tracking-tight flex items-center gap-2">
                    Tuco Assistant
                    <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" strokeWidth={1.5} />
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isOffline ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                    <p className="text-[11px] text-white/90 font-bold uppercase tracking-wider">
                      {isOffline ? 'Offline Mode' : 'Online'}
                    </p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#FAF9F6]">
              <AnimatePresence initial={false}>
                {messages.map((m, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20, y: 10 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <motion.div 
                        whileHover={{ scale: 1.1 }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                          m.role === 'user' 
                            ? 'bg-tuco-cyan text-white border-tuco-cyan/20' 
                            : 'bg-white text-neutral-500 border-neutral-200'
                        }`}
                      >
                        {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </motion.div>
                      <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                        m.role === 'user' 
                          ? 'bg-tuco-cyan text-white rounded-tr-none' 
                          : 'bg-white text-neutral-800 border border-neutral-100 rounded-tl-none'
                      }`}>
                        {m.content}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="flex gap-3 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                      <Bot className="w-4 h-4 text-neutral-400" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-neutral-100 rounded-tl-none shadow-sm flex items-center gap-3">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                            className="w-1.5 h-1.5 bg-tuco-cyan rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Claude is thinking</span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-5 bg-white border-t border-neutral-50">
              <div className="relative group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask for parenting advice..."
                  className="w-full pl-5 pr-12 py-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-medium focus:outline-none focus:border-tuco-cyan focus:ring-4 focus:ring-tuco-cyan/5 transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 bg-tuco-cyan text-white rounded-xl hover:bg-tuco-cyan-hover disabled:opacity-30 disabled:grayscale transition-all shadow-md shadow-tuco-cyan/20"
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-[10px] text-center text-neutral-400 mt-3 font-medium">
                I can help with skincare, growth, and learning tips! 🌟
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, y: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.1)] transition-colors duration-500 group relative ${
          isOpen ? 'bg-neutral-900' : 'bg-tuco-cyan'
        }`}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-7 h-7 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquare className="w-7 h-7 text-white" strokeWidth={1.5} />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 border-2 border-white rounded-full" 
          />
        )}
      </motion.button>
    </div>
  );
}
