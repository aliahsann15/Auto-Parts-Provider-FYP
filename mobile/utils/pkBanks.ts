export type PakistanBank = { code: string; name: string };

// Minimal embedded list to avoid extra network; acts like a small library for PK banks.
const BANKS: PakistanBank[] = [
  { code: 'HBL', name: 'Habib Bank Limited' },
  { code: 'UBL', name: 'United Bank Limited' },
  { code: 'MCB', name: 'MCB Bank' },
  { code: 'ABL', name: 'Allied Bank Limited' },
  { code: 'NBP', name: 'National Bank of Pakistan' },
  { code: 'BOP', name: 'Bank of Punjab' },
  { code: 'BAHL', name: 'Bank Al Habib' },
  { code: 'ASK', name: 'Askari Bank' },
  { code: 'SCB', name: 'Standard Chartered Pakistan' },
  { code: 'FBL', name: 'Faysal Bank' },
  { code: 'JSB', name: 'JS Bank' },
  { code: 'SILK', name: 'Silk Bank' },
  { code: 'MBL', name: 'Meezan Bank' },
  { code: 'HMB', name: 'Habib Metropolitan Bank' },
  { code: 'KBL', name: 'Khushhali Bank' },
];

export async function fetchPakistaniBanks(): Promise<PakistanBank[]> {
  // Simulate async fetch (drop-in for a real library call if added later)
  return BANKS;
}
