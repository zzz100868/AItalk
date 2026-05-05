import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: '用户不存在' });
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      realNameVerified: user.realNameVerified,
    };
  }

  async updateProfile(userId: string, data: { avatar?: string; nickname?: string; bio?: string }) {
    if (data.nickname !== undefined && data.nickname.trim() === '') {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: '昵称不能为空' });
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        ...(data.nickname !== undefined && { nickname: data.nickname }),
        ...(data.bio !== undefined && { bio: data.bio }),
      },
    });
    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      bio: user.bio,
      realNameVerified: user.realNameVerified,
    };
  }

  async getPhotos(userId: string) {
    const photos = await this.prisma.userPhoto.findMany({
      where: { userId },
      orderBy: { sortOrder: 'asc' },
    });
    return { photos: photos.map((p) => ({ id: p.id, url: p.photoUrl, sortOrder: p.sortOrder })) };
  }

  async addPhoto(userId: string, url: string) {
    const count = await this.prisma.userPhoto.count({ where: { userId } });
    if (count >= 8) {
      throw new BadRequestException({ code: 'PHOTO_LIMIT_EXCEEDED', message: '照片墙最多 8 张' });
    }
    const photo = await this.prisma.userPhoto.create({
      data: { userId, photoUrl: url, sortOrder: count },
    });
    return { id: photo.id, url: photo.photoUrl, sortOrder: photo.sortOrder };
  }

  async deletePhoto(userId: string, photoId: string) {
    const photo = await this.prisma.userPhoto.findFirst({ where: { id: photoId, userId } });
    if (!photo) throw new NotFoundException({ code: 'NOT_FOUND', message: '照片不存在' });
    await this.prisma.userPhoto.delete({ where: { id: photoId } });
  }

  async getUserHome(currentUserId: string, author: string) {
    const user = await this.prisma.user.findUnique({ where: { id: author } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: '用户不存在' });
    return {
      name: user.nickname,
      handle: `@${user.id}`,
      avatar: user.avatar,
      bio: user.bio,
      isMe: user.id === currentUserId,
    };
  }
}
