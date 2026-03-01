import { useEffect, useState, useCallback } from "react";
import * as Network from "expo-network";

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  const checkConnection = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setIsConnected(state.isConnected ?? true);
    } catch {
      setIsConnected(true); // Assume connected if check fails
    }
  }, []);

  useEffect(() => {
    checkConnection();

    // Poll every 5 seconds since expo-network doesn't have addEventListener
    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [checkConnection]);

  return { isConnected };
}
