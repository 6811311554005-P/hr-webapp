"use client";

import { Trash2, AlertTriangle, Loader } from "lucide-react";

interface DeleteEmployeeDialogProps {
  isOpen: boolean;
  employeeName: string;
  isDeleting: boolean;
  error?: string | null;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export default function DeleteEmployeeDialog({
  isOpen,
  employeeName,
  isDeleting,
  error,
  onConfirm,
  onCancel,
}: DeleteEmployeeDialogProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* ─── Backdrop ────────────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity"
        onClick={onCancel}
        role="presentation"
      />

      {/* ─── Dialog ───────────────────────────────────────────────────────── */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full pointer-events-auto border border-zinc-200 dark:border-zinc-800 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Icon & Title ─────────────────────────────────────────────── */}
          <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800/50 p-6 flex flex-col items-center text-center">
            <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-4 mb-4">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-red-900 dark:text-red-100 mb-1">
              Delete Employee?
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300">
              This action cannot be undone
            </p>
          </div>

          {/* ─── Content ──────────────────────────────────────────────────── */}
          <div className="p-6 space-y-4">
            {/* Employee Name Highlight */}
            <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4 border border-zinc-200 dark:border-zinc-700">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                You are about to delete:
              </p>
              <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {employeeName}
              </p>
            </div>

            {/* Warning List */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                Consequences:
              </p>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span>Employee record will be permanently deleted</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span>All associated data will be removed</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-500 font-bold mt-1">•</span>
                  <span>This cannot be reversed</span>
                </li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}
          </div>

          {/* ─── Actions ──────────────────────────────────────────────────── */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex gap-3">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="flex-1 px-4 py-3 bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-zinc-100 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Keep Employee
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={18} />
                  Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
