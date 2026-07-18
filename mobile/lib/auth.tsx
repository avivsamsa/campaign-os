import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { TOKEN_KEY, NAME_KEY } from './config';

type AuthState = {
  token: string | null;
  clientName: string | null;
  ready: boolean;
  signIn: (token: string, name: string | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  token: null,
  clientName: null,
  ready: false,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setToken(await SecureStore.getItemAsync(TOKEN_KEY));
        setClientName(await SecureStore.getItemAsync(NAME_KEY));
      } catch {
        /* ignore */
      } finally {
        setReady(true);
      }
    })();
  }, []);

  async function signIn(t: string, name: string | null) {
    await SecureStore.setItemAsync(TOKEN_KEY, t);
    if (name) await SecureStore.setItemAsync(NAME_KEY, name);
    setToken(t);
    setClientName(name);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(NAME_KEY);
    setToken(null);
    setClientName(null);
  }

  return (
    <AuthContext.Provider value={{ token, clientName, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
