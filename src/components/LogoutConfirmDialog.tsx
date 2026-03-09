import React from 'react';
import { LogOut, X } from 'lucide-react';

interface LogoutConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({ open, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 mb-6 sm:mb-0 bg-card rounded-2xl border border-border shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="h-6 w-6 text-destructive" />
            </div>
            <button
              onClick={onCancel}
              className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95 transition-all"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-foreground">Sign Out?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            You will be logged out of your account. Make sure you've saved any unsaved changes.
          </p>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onCancel}
              className="flex-1 h-11 rounded-xl border border-border text-foreground font-semibold text-sm active:scale-95 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmDialog;
