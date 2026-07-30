import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

export default function ConfirmDialog({
  open, onCancel, onConfirm, title, message, confirmLabel = 'Confirmar', danger = false
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      maxWidth="sm"
      zIndex={70}
      icon={<AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-yellow-400'}`} />}
      footer={
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-2.5 rounded-xl transition-colors border border-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-bold py-2.5 rounded-xl transition-all ${
              danger ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-[#00F0FF] hover:bg-[#00D1FF] text-[#0B0F19]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-gray-300 p-6">{message}</p>
    </Modal>
  );
}
