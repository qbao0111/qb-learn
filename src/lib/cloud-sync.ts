import { create } from 'zustand';
import { useStore, type Bank } from '../store';

const SYNC_CODE_KEY = 'qblearn-sync-code';
const POLL_INTERVAL_MS = 5_000;
const PUSH_DELAY_MS = 700;

type SyncPhase = 'disconnected' | 'connecting' | 'syncing' | 'synced' | 'error' | 'unavailable';

interface SyncUiState {
  phase: SyncPhase;
  message: string;
  connected: boolean;
  lastSyncedAt: number | null;
}

interface CloudSnapshot {
  banks: Bank[];
  activeBankId: string | null;
}

interface SyncResponse {
  revision: number;
  snapshot?: CloudSnapshot | null;
  error?: string;
}

export const useCloudSyncState = create<SyncUiState>(() => ({
  phase: 'disconnected',
  message: 'Chưa kết nối đồng bộ.',
  connected: false,
  lastSyncedAt: null,
}));

let currentRevision = 0;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let unsubscribeStore: (() => void) | null = null;
let requestInFlight = false;
let hasUnsyncedChanges = false;

function apiEndpoint() {
  const configuredBase = (import.meta.env.VITE_SYNC_API_URL || '').replace(/\/$/, '');
  if (configuredBase) return `${configuredBase}/api/sync`;
  if (window.location.hostname.endsWith('github.io')) return null;
  return '/api/sync';
}

function getSyncCode() {
  return localStorage.getItem(SYNC_CODE_KEY)?.trim() || '';
}

function setUiState(update: Partial<SyncUiState>) {
  useCloudSyncState.setState(update);
}

function applySnapshot(snapshot: CloudSnapshot) {
  applyingRemote = true;
  useStore.setState({
    banks: snapshot.banks,
    activeBankId:
      snapshot.banks.some((bank) => bank.id === snapshot.activeBankId)
        ? snapshot.activeBankId
        : snapshot.banks[0]?.id || null,
  });
  queueMicrotask(() => {
    applyingRemote = false;
  });
}

async function requestSync(method: 'GET' | 'PUT', body?: unknown) {
  const endpoint = apiEndpoint();
  if (!endpoint) throw new Error('Backend đồng bộ chưa được cấu hình.');
  const code = getSyncCode();
  if (!code) throw new Error('Chưa có mã đồng bộ.');

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-QB-Sync-Code': code,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = (await response.json()) as SyncResponse;
  if (!response.ok && response.status !== 409) {
    throw new Error(data.error || 'Không thể kết nối dịch vụ đồng bộ.');
  }
  return { response, data };
}

async function pushSnapshot() {
  if (requestInFlight || !getSyncCode()) return;
  requestInFlight = true;
  setUiState({ phase: 'syncing', message: 'Đang lưu thay đổi lên Neon…' });
  try {
    const state = useStore.getState();
    const snapshot = { banks: state.banks, activeBankId: state.activeBankId };
    let { response, data } = await requestSync('PUT', {
      baseRevision: currentRevision,
      snapshot,
    });

    if (response.status === 409) {
      currentRevision = data.revision;
      ({ response, data } = await requestSync('PUT', {
        baseRevision: currentRevision,
        snapshot,
      }));
      if (response.status === 409) {
        throw new Error('Có nhiều thay đổi cùng lúc. Vui lòng bấm Đồng bộ ngay.');
      }
    }

    hasUnsyncedChanges = false;
    currentRevision = data.revision;
    setUiState({
      phase: 'synced',
      connected: true,
      message: 'Đã đồng bộ với Neon.',
      lastSyncedAt: Date.now(),
    });
  } catch (error) {
    setUiState({
      phase: 'error',
      message: error instanceof Error ? error.message : 'Đồng bộ thất bại.',
    });
  } finally {
    requestInFlight = false;
  }
}

function schedulePush() {
  if (applyingRemote || !getSyncCode()) return;
  hasUnsyncedChanges = true;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushSnapshot(), PUSH_DELAY_MS);
}

async function pullSnapshot() {
  if (hasUnsyncedChanges) {
    await pushSnapshot();
    return;
  }
  if (requestInFlight || !getSyncCode()) return;
  requestInFlight = true;
  try {
    const { data } = await requestSync('GET');
    if (data.snapshot && data.revision > currentRevision) {
      currentRevision = data.revision;
      applySnapshot(data.snapshot);
      setUiState({
        phase: 'synced',
        connected: true,
        message: 'Đã nhận thay đổi từ thiết bị khác.',
        lastSyncedAt: Date.now(),
      });
    }
  } catch (error) {
    setUiState({
      phase: 'error',
      message: error instanceof Error ? error.message : 'Không thể tải dữ liệu đồng bộ.',
    });
  } finally {
    requestInFlight = false;
  }
}

export async function connectCloudSync(code: string) {
  const normalizedCode = code.trim();
  if (normalizedCode.length < 8) throw new Error('Mã đồng bộ cần ít nhất 8 ký tự.');
  localStorage.setItem(SYNC_CODE_KEY, normalizedCode);
  setUiState({ phase: 'connecting', connected: false, message: 'Đang kết nối Neon…' });

  try {
    const { data } = await requestSync('GET');
    currentRevision = data.revision;

    if (!data.snapshot) {
      await pushSnapshot();
      return;
    }

    const localState = useStore.getState();
    const remoteIds = new Set(data.snapshot.banks.map((bank) => bank.id));
    const localOnly = localState.banks.filter((bank) => !remoteIds.has(bank.id));
    const mergedSnapshot: CloudSnapshot = {
      banks: [...data.snapshot.banks, ...localOnly],
      activeBankId:
        localOnly.some((bank) => bank.id === localState.activeBankId)
          ? localState.activeBankId
          : data.snapshot.activeBankId,
    };
    applySnapshot(mergedSnapshot);

    if (localOnly.length > 0) await pushSnapshot();
    else {
      setUiState({
        phase: 'synced',
        connected: true,
        message: 'Đã tải bộ đề từ Neon.',
        lastSyncedAt: Date.now(),
      });
    }
  } catch (error) {
    localStorage.removeItem(SYNC_CODE_KEY);
    setUiState({
      phase: 'error',
      connected: false,
      message: error instanceof Error ? error.message : 'Không thể kết nối Neon.',
    });
    throw error;
  }
}

export function disconnectCloudSync() {
  localStorage.removeItem(SYNC_CODE_KEY);
  currentRevision = 0;
  hasUnsyncedChanges = false;
  if (pushTimer) clearTimeout(pushTimer);
  setUiState({
    phase: 'disconnected',
    connected: false,
    message: 'Đã ngắt đồng bộ trên thiết bị này.',
    lastSyncedAt: null,
  });
}

export async function syncCloudNow() {
  await pullSnapshot();
  if (useCloudSyncState.getState().phase !== 'error') await pushSnapshot();
}

export function startCloudSync() {
  unsubscribeStore ??= useStore.subscribe((state, previousState) => {
    if (state.banks !== previousState.banks || state.activeBankId !== previousState.activeBankId) {
      schedulePush();
    }
  });
  pollTimer ??= setInterval(() => void pullSnapshot(), POLL_INTERVAL_MS);

  const code = getSyncCode();
  if (code) void connectCloudSync(code).catch(() => undefined);
  else if (!apiEndpoint()) {
    setUiState({
      phase: 'unavailable',
      connected: false,
      message: 'Backend đồng bộ chưa được cấu hình.',
    });
  }

  return () => {
    unsubscribeStore?.();
    unsubscribeStore = null;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = null;
  };
}

export function hasStoredSyncCode() {
  return Boolean(getSyncCode());
}
