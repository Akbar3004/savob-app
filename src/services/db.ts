import { Transaction } from '../types';

const REGISTRY_BIN_ID = '019f6bf3-02f7-7ca7-a20f-74b70a54e102';
const BASE_URL = '/api/bins';

export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

interface UserRegistry {
  users: {
    [hashedPassword: string]: string; // hashedPassword -> binId
  };
}

async function fetchRegistry(): Promise<UserRegistry> {
  try {
    const res = await fetch(`${BASE_URL}/${REGISTRY_BIN_ID}`);
    if (!res.ok) {
      throw new Error('Registry registry fetch failed');
    }
    const data = await res.json();
    return data.users ? data : { users: {} };
  } catch (error) {
    console.error('Error fetching registry:', error);
    return { users: {} };
  }
}

async function saveRegistry(registry: UserRegistry): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${REGISTRY_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registry),
    });
    return res.ok;
  } catch (error) {
    console.error('Error saving registry:', error);
    return false;
  }
}

export async function checkPasswordExists(hashedPassword: string): Promise<string | null> {
  const registry = await fetchRegistry();
  return registry.users[hashedPassword] || null;
}

export async function registerUser(hashedPassword: string, initialData: { transactions: Transaction[]; charityPercentage: number; exchangeRate: number }): Promise<string | null> {
  try {
    // 1. Create a new bin for the user
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initialData),
    });
    if (!res.ok) {
      throw new Error('Failed to create user bin');
    }
    const result = await res.json();
    const userBinId = result.id;

    // 2. Add to registry
    const registry = await fetchRegistry();
    registry.users[hashedPassword] = userBinId;
    const registrySaved = await saveRegistry(registry);

    if (registrySaved) {
      return userBinId;
    }
    return null;
  } catch (error) {
    console.error('Error registering user:', error);
    return null;
  }
}

export async function loadUserData(binId: string): Promise<{ transactions: Transaction[]; charityPercentage: number; exchangeRate: number } | null> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`);
    if (!res.ok) {
      throw new Error('Failed to load user data');
    }
    const data = await res.json();
    return {
      transactions: data.transactions || [],
      charityPercentage: typeof data.charityPercentage === 'number' ? data.charityPercentage : 10,
      exchangeRate: typeof data.exchangeRate === 'number' ? data.exchangeRate : 12850,
    };
  } catch (error) {
    console.error('Error loading user data:', error);
    return null;
  }
}

export async function saveUserData(binId: string, data: { transactions: Transaction[]; charityPercentage: number; exchangeRate: number }): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${binId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return res.ok;
  } catch (error) {
    console.error('Error saving user data:', error);
    return false;
  }
}
