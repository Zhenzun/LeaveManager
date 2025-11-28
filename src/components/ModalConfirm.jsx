import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ModalConfirm({ isOpen, onClose, onConfirm, title, message, isDanger }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all scale-100">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              {isDanger && <AlertTriangle className="text-red-500" />} {title}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
          </div>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">{message}</p>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold text-sm hover:bg-gray-100 rounded-lg transition-colors">
              Batal
            </button>
            <button 
              onClick={onConfirm} 
              className={`px-4 py-2 text-white font-bold text-sm rounded-lg shadow-md transition-transform active:scale-95
                ${isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              Ya, Lanjutkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}