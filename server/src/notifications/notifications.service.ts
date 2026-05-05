import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string, opts: { cursor?: string; limit: number; type?: string }) {
    const where: any = { userId };
    if (opts.type) where.type = opts.type;
    if (opts.cursor) where.id = { lt: opts.cursor };

    const notifications = await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts.limit + 1,
    });

    const hasMore = notifications.length > opts.limit;
    const data = notifications.slice(0, opts.limit);

    const unreadCount = await this.prisma.notification.count({
      where: { userId, read: false },
    });

    return {
      data: data.map((n) => ({
        id: n.id,
        type: n.type,
        author: n.authorName,
        avatar: n.authorAvatar,
        content: n.content,
        time: this.formatRelativeTime(n.createdAt),
        read: n.read,
      })),
      hasMore,
      cursor: hasMore ? data[data.length - 1].id : null,
      unreadCount,
    };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async clearAll(userId: string) {
    await this.prisma.notification.deleteMany({ where: { userId } });
  }

  private formatRelativeTime(date: Date): string {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toISOString().slice(0, 10).replace(/-/g, '.');
  }
}
