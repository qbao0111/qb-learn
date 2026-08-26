import { useState, useRef, useEffect } from 'react';
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  X, 
  CheckCircle2, 
  ShieldCheck,
  Unlink
} from 'lucide-react';
import {
  connectCloudSync,
  disconnectCloudSync,
  hasStoredSyncCode,
  syncCloudNow,
  useCloudSyncState,
} from '../lib/cloud-sync';

interface NeonSyncPopoverProps {
  compact?: boolean;
}

export function NeonSyncPopover({ compact = false }: NeonSyncPopoverProps) {
  const syncState = useCloudSyncState();
  const [isOpen, setIsOpen] = useState(false);
  const [syncCode, setSyncCode] = useState('');
  const [syncActionError, setSyncActionError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleConnectSync = async () => {
    setSyncActionError('');
    try {
      await connectCloudSync(syncCode);
      setSyncCode('');
    } catch (error) {
      setSyncActionError(error instanceof Error ? error.message : 'Không thể kết nối đồng bộ.');
    }
  };

  const isSyncing = syncState.phase === 'syncing';
  const isConnecting = syncState.phase === 'connecting';

  return (
    <div className="relative inline-flex items-center">
      {/* Trigger Button */}
      {compact ? (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`icon-btn relative min-h-9 min-w-9 rounded-xl border border-border bg-surface ${
            syncState.connected 
              ? 'text-emerald-600 dark:text-emerald-400 border-emerald-300/40 bg-emerald-50/50 dark:bg-emerald-950/30' 
              : 'text-text-muted hover:text-text'
          }`}
          title={syncState.connected ? 'Neon Cloud: Đã kết nối' : 'Neon Cloud: Chưa kích hoạt'}
          aria-label="Cài đặt đồng bộ Neon Cloud"
          aria-expanded={isOpen}
        >
          {isSyncing ? (
            <RefreshCw size={17} className="animate-spin text-primary" />
          ) : syncState.connected ? (
            <Cloud size={17} />
          ) : (
            <CloudOff size={17} />
          )}
          <span 
            className={`absolute right-1 top-1 size-2 rounded-full ring-2 ring-surface ${
              syncState.connected ? 'bg-emerald-500' : 'bg-text-muted/60'
            }`} 
          />
        </button>
      ) : (
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
            syncState.connected
              ? 'border-emerald-300/60 bg-emerald-50/60 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-300 shadow-xs'
              : 'border-border bg-surface text-text-secondary hover:border-primary/40 hover:text-text shadow-xs'
          }`}
          aria-expanded={isOpen}
          aria-label="Cài đặt đồng bộ Neon Cloud"
        >
          {isSyncing ? (
            <RefreshCw size={14} className="animate-spin text-primary shrink-0" />
          ) : syncState.connected ? (
            <Cloud size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <CloudOff size={14} className="text-text-muted shrink-0" />
          )}

          <span className="flex items-center gap-1.5">
            <span 
              className={`size-1.5 rounded-full ${
                syncState.connected ? 'bg-emerald-500' : 'bg-text-muted/60'
              }`} 
            />
            <span>
              {isSyncing 
                ? 'Đang đồng bộ…' 
                : syncState.connected 
                  ? 'Neon · Đã kết nối' 
                  : 'Neon · Chưa bật'}
            </span>
          </span>
        </button>
      )}

      {/* Popover Card */}
      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface p-4 shadow-xl shadow-black/10 transition-all animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-label="Bảng điều khiển đồng bộ Neon Cloud"
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between border-b border-border/70 pb-3">
            <div className="flex items-center gap-2">
              <div className={`flex size-8 items-center justify-center rounded-lg ${
                syncState.connected 
                  ? 'bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' 
                  : 'bg-primary/10 text-primary'
              }`}>
                {syncState.connected ? <Cloud size={17} /> : <CloudOff size={17} />}
              </div>
              <div>
                <h4 className="text-sm font-bold text-text leading-tight">Đồng bộ Neon Cloud</h4>
                <p className="text-[11px] text-text-muted">Đồng bộ dữ liệu đa thiết bị</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`badge ${syncState.connected ? 'badge-success' : 'badge-muted'} text-[10px] py-0.5 px-2`}>
                {syncState.connected ? 'Đã bật' : 'Chưa bật'}
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="icon-btn min-h-6 min-w-6 rounded-md text-text-muted hover:text-text"
                aria-label="Đóng bảng đồng bộ"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Status message */}
          <div className="py-3">
            <div className="rounded-xl bg-surface-2 p-2.5 text-xs text-text-secondary space-y-1">
              <p className="font-medium text-text leading-relaxed">{syncState.message}</p>
              {syncState.lastSyncedAt && (
                <p className="text-[11px] text-text-muted flex items-center gap-1">
                  <CheckCircle2 size={12} className="text-emerald-500" />
                  Đồng bộ lần cuối: {new Date(syncState.lastSyncedAt).toLocaleTimeString('vi-VN')}
                </p>
              )}
            </div>
          </div>

          {/* Body actions */}
          {!syncState.connected ? (
            <div className="space-y-2.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-text">
                  Mã đồng bộ (Passkey)
                </label>
                <input
                  type="password"
                  value={syncCode}
                  onChange={(event) => setSyncCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleConnectSync();
                  }}
                  placeholder="Nhập mã bí mật (tối thiểu 8 ký tự)"
                  autoComplete="off"
                  className="input px-3 py-2 text-xs bg-surface"
                />
              </div>

              <button
                type="button"
                onClick={() => void handleConnectSync()}
                disabled={isConnecting || syncCode.trim().length < 8}
                className="btn btn-primary w-full text-xs font-semibold py-2 shadow-sm shadow-primary/20 disabled:opacity-50"
              >
                {isConnecting ? 'Đang kết nối…' : hasStoredSyncCode() ? 'Kết nối lại' : 'Kích hoạt đồng bộ'}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void syncCloudNow()}
                disabled={isSyncing}
                className="btn btn-primary w-full text-xs font-semibold py-2 shadow-sm shadow-primary/20"
              >
                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Đang đồng bộ dữ liệu…' : 'Đồng bộ ngay bây giờ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  disconnectCloudSync();
                  setIsOpen(false);
                }}
                className="btn btn-ghost w-full text-xs text-text-muted hover:text-danger py-1.5"
              >
                <Unlink size={13} />
                <span>Ngắt kết nối đồng bộ</span>
              </button>
            </div>
          )}

          {/* Error notice */}
          {syncActionError && (
            <p className="mt-2.5 rounded-lg border border-danger/30 bg-danger-subtle px-2.5 py-1.5 text-[11px] font-medium text-danger" role="alert">
              {syncActionError}
            </p>
          )}

          {/* Popover Footer Info */}
          <div className="mt-3 border-t border-border/60 pt-2.5 flex items-start gap-1.5 text-[10px] text-text-muted leading-tight">
            <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
            <span>Mã hóa đầu cuối. Sử dụng cùng một mã passkey trên máy tính và điện thoại để liên kết dữ liệu.</span>
          </div>
        </div>
      )}
    </div>
  );
}
