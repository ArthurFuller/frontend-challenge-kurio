import { ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";

const clients = new Set<ReturnType<typeof toSocketIo>["client"]>();
// MSW normalizes Socket.IO's /socket.io/ transport path to / for matching.
const protocol = location.protocol === "https:" ? "wss:" : "ws:";
const link = ws.link(`${protocol}//${location.host}/`);

export const socketHandler = link.addEventListener(
  "connection",
  (connection) => {
    const socket = toSocketIo(connection).client;
    clients.add(socket);
    connection.client.addEventListener("close", () => clients.delete(socket));
  },
);

export function emitSocketEvent(name: string, payload: unknown) {
  for (const client of clients) client.emit(name, payload);
}
