import type { Bank } from '../store';

export interface QBLearnBackup {
  app: 'QB Learn';
  version: 1;
  exportedAt: string;
  banks: Bank[];
}

export function createBanksBackup(banks: Bank[]): QBLearnBackup {
  return {
    app: 'QB Learn',
    version: 1,
    exportedAt: new Date().toISOString(),
    banks,
  };
}

export function downloadBanksBackup(banks: Bank[]) {
  const backup = createBanksBackup(banks);
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `qb-learn-backup-${backup.exportedAt.slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function readBanksBackup(file: File): Promise<Bank[]> {
  const parsed = JSON.parse(await file.text()) as Partial<QBLearnBackup>;
  if (parsed.app !== 'QB Learn' || parsed.version !== 1 || !Array.isArray(parsed.banks)) {
    throw new Error('File sao lưu không đúng định dạng QB Learn.');
  }

  const validBanks = parsed.banks.filter((bank) => (
    bank
    && typeof bank.id === 'string'
    && typeof bank.name === 'string'
    && Array.isArray(bank.questions)
  ));

  if (!validBanks.length) {
    throw new Error('File sao lưu không chứa bộ đề hợp lệ.');
  }

  return validBanks;
}
