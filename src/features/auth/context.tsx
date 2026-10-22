import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../../lib/supabase";
import { getAccess } from "./api";
type Access = Awaited<ReturnType<typeof getAccess>>;
const Context = createContext<{
  access: Access;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ access: null, loading: true, refresh: async () => {} });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Access>(null),
    [loading, setLoading] = useState(true);
  async function refresh() {
    try {
      setAccess(supabase ? await getAccess() : null);
    } catch {
      setAccess(null);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    const sub = supabase?.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => sub?.data.subscription.unsubscribe();
  }, []);
  return (
    <Context.Provider value={{ access, loading, refresh }}>
      {children}
    </Context.Provider>
  );
}
export const useAuth = () => useContext(Context);
