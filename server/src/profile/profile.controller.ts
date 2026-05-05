import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, JwtPayload } from '../auth/current-user.decorator';

@Controller()
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.profileService.getProfile(user.sub);
  }

  @Put('me')
  updateMe(@CurrentUser() user: JwtPayload, @Body() body: { avatar?: string; nickname?: string; bio?: string }) {
    return this.profileService.updateProfile(user.sub, body);
  }

  @Get('me/photos')
  getPhotos(@CurrentUser() user: JwtPayload) {
    return this.profileService.getPhotos(user.sub);
  }

  @Post('me/photos')
  addPhoto(@CurrentUser() user: JwtPayload, @Body() body: { url: string }) {
    return this.profileService.addPhoto(user.sub, body.url);
  }

  @Delete('me/photos/:id')
  deletePhoto(@CurrentUser() user: JwtPayload, @Param('id') photoId: string) {
    return this.profileService.deletePhoto(user.sub, photoId);
  }

  @Get('users/:author/home')
  getUserHome(@CurrentUser() user: JwtPayload, @Param('author') author: string) {
    return this.profileService.getUserHome(user.sub, author);
  }
}
