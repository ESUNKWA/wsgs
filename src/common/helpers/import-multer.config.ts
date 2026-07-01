import { memoryStorage } from 'multer';
import { BadRequestException } from '@nestjs/common';

const ALLOWED_MIMETYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
  'text/plain',
];

export const importMulterOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) {
      return cb(new BadRequestException('Seuls les fichiers CSV et Excel (.csv, .xlsx, .xls) sont acceptés'), false);
    }
    cb(null, true);
  },
};
