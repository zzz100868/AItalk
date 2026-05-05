import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { MemoryService } from './memory.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, JwtPayload } from '../auth/current-user.decorator';

@Controller('memory')
@UseGuards(AuthGuard)
export class MemoryController {
  constructor(private readonly memoryService: MemoryService) {}

  @Get('chat')
  getChat(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.memoryService.getChatHistory(user.sub, cursor, Number(limit) || 50);
  }

  @Post('chat')
  sendChat(@CurrentUser() user: JwtPayload, @Body() body: { content: string }) {
    return this.memoryService.sendMessage(user.sub, body.content);
  }

  @Get('insights')
  getInsights(@CurrentUser() user: JwtPayload, @Query('category') category?: string) {
    return this.memoryService.getInsights(user.sub, category);
  }

  @Put('insights/:id')
  updateInsight(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { title?: string; content?: string },
  ) {
    return this.memoryService.updateInsight(user.sub, id, body);
  }

  @Delete('insights/:id')
  @HttpCode(204)
  deleteInsight(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.memoryService.deleteInsight(user.sub, id);
  }

  @Get('archive')
  getArchive(@CurrentUser() user: JwtPayload) {
    return this.memoryService.getArchive(user.sub);
  }
}
