const PKCE_SLOTS_KEY = 'playme_pkce_slots';

type PkceSlot = {
  state: string;
  verifier: string;
  redirectUri: string;
  createdAt: number;
  used?: boolean;
};

const TTL_MS = 10 * 60 * 1000; // 10分
const MAX_SLOTS = 3;

const read = (): PkceSlot[] => {
  try { 
    return JSON.parse(localStorage.getItem(PKCE_SLOTS_KEY) || '[]'); 
  } catch { 
    return []; 
  }
};

const write = (a: PkceSlot[]) => localStorage.setItem(PKCE_SLOTS_KEY, JSON.stringify(a));

export function pkceSave(slot: Omit<PkceSlot, 'createdAt'|'used'>) {
  const list = read().filter(s => Date.now() - s.createdAt < TTL_MS && !s.used);
  list.push({ ...slot, createdAt: Date.now(), used: false });
  while (list.length > MAX_SLOTS) list.shift();
  write(list);
}

export function pkceLoadByState(state: string) {
  const list = read();
  return list.find(s => s.state === state && Date.now() - s.createdAt < TTL_MS && !s.used) ?? null;
}

export function pkceMarkUsed(state: string) {
  const list = read();
  const i = list.findIndex(s => s.state === state);
  const entry = list[i]
  if (i >= 0 && entry) { 
    entry.used = true; 
    write(list); 
  }
}

export function pkceList() { 
  return read(); 
} // デバッグ用（devのみ）

export function pkceGC() {
  const list = read().filter(s => Date.now() - s.createdAt < TTL_MS && !s.used);
  write(list);
}