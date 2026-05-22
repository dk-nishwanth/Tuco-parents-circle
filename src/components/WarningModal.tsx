import React from 'react';
import { AlertCircle, CheckCircle2, X, Info } from 'lucide-react';

interface WarningModalProps {
  isOpen: boolean;
  type?: 'warning' | 'success' | 'info' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export function WarningModal({ isOpen, type = 'warning', title, message, onClose }: WarningModalProps) {
  if (!isOpen) return null;

  const config = {
    warning: {
      icon: AlertCircle,
      iconColor: 'text-amber-500',
      bgGradient: 'bg-gradient-to-br from-amber-50 to-orange-50'
    },
    success: {
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      bgGradient: 'bg-gradient-to-br from-emerald-50 to-green-50'
    },
    info: {
      icon: Info,
      iconColor: 'text-tuco-cyan',
      bgGradient: 'bg-gradient-to-br from-cyan-50 to-blue-50'
    },
    error: {
      icon: AlertCircle,
      iconColor: 'text-red-500',
      bgGradient: 'bg-gradient-to-br from-red-50 to-rose-50'
    }
  }[type];

  const IconComponent = config.icon;

  return (
    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-[70] overflow-y-auto">
      <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in-50 zoom-in-95 duration-200 text-left my-auto">
        <div className={`${config.bgGradient} px-6 py-6 text-center border-b border-neutral-200`}>
          <IconComponent className={`w-12 h-12 ${config.iconColor} mx-auto mb-3`} />
          <h2 className="font-display font-black text-lg text-neutral-800 mb-2">{title}</h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-neutral-600 font-medium leading-relaxed">{message}</p>

          <button
            onClick={onClose}
            className="w-full mt-6 py-3 bg-tuco-cyan hover:bg-tuco-cyan-hover text-white font-display font-black text-sm rounded-xl transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
