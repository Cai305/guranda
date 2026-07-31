import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { uploadToBlob } from '../blob.util';
import { JwtAuthGuard } from '../auth/auth.guard';

// Was fully unauthenticated — anyone, with no account at all, could upload
// arbitrary files (up to 50MB) to blob storage. Gated behind login now.
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (
        _req: Request,
        file: Express.Multer.File,
        cb: (err: Error | null, accept: boolean) => void,
      ) => {
        if (
          !file.mimetype.startsWith('image/') &&
          !file.mimetype.startsWith('video/') &&
          !file.mimetype.startsWith('audio/')
        ) {
          return cb(
            new BadRequestException(
              'Only image, video, or audio files allowed',
            ),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    const isVideo = file.mimetype.startsWith('video/');
    const isAudio = file.mimetype.startsWith('audio/');
    const folder = isVideo ? 'videos' : isAudio ? 'audio' : 'images';
    const url = await uploadToBlob(folder, file);
    return { url, mediaType: isVideo ? 'VIDEO' : isAudio ? 'AUDIO' : 'IMAGE' };
  }
}
