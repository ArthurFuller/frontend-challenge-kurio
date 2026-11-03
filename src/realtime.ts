import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Nft, Order } from "./types";

export function useRealtime(userId?: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    let active = true;
    let disconnect = () => {};
    const versions = new Map<string, number>();
    void import("socket.io-client").then(({ io }) => {
      if (!active) return;
      const socket = io(location.origin, {
        path: "/socket.io/",
        transports: ["websocket"],
        reconnection: true,
      });
      socket.on("connect", () => {
        void queryClient.invalidateQueries({ queryKey: ["nfts"] });
        void queryClient.invalidateQueries({ queryKey: ["cart"] });
        void queryClient.invalidateQueries({ queryKey: ["quote"] });
        if (userId) void queryClient.invalidateQueries({ queryKey: ["order"] });
      });
      socket.on(
        "nft.updated",
        (event: { id: string; version: number; resource: Nft }) => {
          const key = `nft:${event.id}`;
          if (event.version <= (versions.get(key) || 0)) return;
          versions.set(key, event.version);
          queryClient.setQueryData(["nft", event.id], event.resource);
          void queryClient.invalidateQueries({ queryKey: ["nfts"] });
          void queryClient.invalidateQueries({ queryKey: ["quote"] });
        },
      );
      socket.on(
        "order.updated",
        (event: {
          id: string;
          userId: string;
          version: number;
          resource: Order;
        }) => {
          if (!userId || event.userId !== userId) return;
          const key = `order:${event.id}`;
          if (event.version <= (versions.get(key) || 0)) return;
          versions.set(key, event.version);
          queryClient.setQueryData(["order", event.id], event.resource);
          void queryClient.invalidateQueries({ queryKey: ["cart"] });
        },
      );
      disconnect = () => socket.disconnect();
    });
    return () => {
      active = false;
      disconnect();
    };
  }, [queryClient, userId]);
}
