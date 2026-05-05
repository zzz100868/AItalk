import { Injectable, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async wxLogin(code: string) {
    if (!code) {
      throw new BadRequestException({ code: 'WX_CODE_INVALID', message: 'code 不能为空' });
    }

    // Phase 1: mock openid from code (真实实现需调用微信 code2session API)
    const openid = `mock_openid_${code}`;

    let user = await this.prisma.user.findUnique({ where: { openid } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: '新用户',
          avatar: '',
          bio: '',
        },
      });
    }

    const token = await this.jwt.signAsync({ sub: user.id, openid: user.openid });

    return {
      token,
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio,
        realNameVerified: user.realNameVerified,
      },
    };
  }
}
