import { redis } from "./redis";

export interface Notification {
  id: string;
  recipient: string;
  message: string;
  brName: string;
  stage: string;
  read: boolean;
  createdAt: string;
}

export async function createNotification(recipient: string, message: string, brName: string, stage: string) {
  const notif: Notification = {
    id: crypto.randomUUID(),
    recipient, message, brName, stage,
    read: false,
    createdAt: new Date().toISOString(),
  };
  await redis.lpush(`notifications:${recipient}`, JSON.stringify(notif));
  await redis.ltrim(`notifications:${recipient}`, 0, 99);
}

export async function getNotifications(recipient: string): Promise<Notification[]> {
  const raw = await redis.lrange(`notifications:${recipient}`, 0, 49);
  return raw.map((r) => typeof r === "string" ? JSON.parse(r) : r as unknown as Notification);
}

export async function markRead(recipient: string, notifId: string) {
  const all = await getNotifications(recipient);
  const updated = all.map((n) => n.id === notifId ? { ...n, read: true } : n);
  await redis.del(`notifications:${recipient}`);
  for (const n of updated.reverse()) {
    await redis.lpush(`notifications:${recipient}`, JSON.stringify(n));
  }
}

export async function getUnreadCount(recipient: string): Promise<number> {
  const all = await getNotifications(recipient);
  return all.filter((n) => !n.read).length;
}
