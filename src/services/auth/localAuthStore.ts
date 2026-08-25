const ACCOUNTS_STORAGE_KEY = 'aniworld_registered_accounts';

export interface LocalRegisteredAccount {
  email: string;
  username: string;
  passwordHash: string;
  createdAt: string;
}

export function getRegisteredAccounts(): LocalRegisteredAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function registerLocalAccount(email: string, password: string, username: string): LocalRegisteredAccount {
  const accounts = getRegisteredAccounts();
  const normalizedEmail = email.trim().toLowerCase();

  const existing = accounts.find((a) => a.email === normalizedEmail);
  if (existing) {
    return existing;
  }

  const newAcc: LocalRegisteredAccount = {
    email: normalizedEmail,
    username: username.trim() || normalizedEmail.split('@')[0],
    passwordHash: btoa(password),
    createdAt: new Date().toISOString(),
  };

  accounts.push(newAcc);
  try {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.warn('Local account registration notice:', err);
  }

  return newAcc;
}

export function verifyLocalAccount(email: string, password: string): LocalRegisteredAccount | null {
  const accounts = getRegisteredAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  const hash = btoa(password);

  const matched = accounts.find(
    (a) => a.email === normalizedEmail && a.passwordHash === hash
  );

  return matched || null;
}

export function accountExists(email: string): boolean {
  const accounts = getRegisteredAccounts();
  const normalizedEmail = email.trim().toLowerCase();
  return accounts.some((a) => a.email === normalizedEmail);
}
