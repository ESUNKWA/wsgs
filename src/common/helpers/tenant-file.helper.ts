import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import * as path from 'path';
import { BadRequestException } from '@nestjs/common';

/** Decode the JWT in the Authorization header and return structureId, or null. */
export function extractStructureIdFromReq(req: any): number | null {
  const token = (req.headers?.authorization ?? '').replace('Bearer ', '');
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    return payload?.structureId ? +payload.structureId : null;
  } catch {
    return null;
  }
}

/** Absolute disk path for a tenant subfolder. Falls back to public/{sub} when structureId is null. */
export function buildTenantDir(structureId: number | null, subfolder: string): string {
  const sub = subfolder.replace(/^\//, '');
  return structureId
    ? path.join(process.cwd(), 'public', 'tenants', String(structureId), sub)
    : path.join(process.cwd(), 'public', sub);
}

/** Relative path stored in DB and used to build the URL: api/tenants/{id}/{sub}/{filename} */
export function buildTenantFilePath(structureId: number | null, subfolder: string, filename: string): string {
  const sub = subfolder.replace(/^\//, '');
  return structureId
    ? `api/tenants/${structureId}/${sub}/${filename}`
    : `api/${sub}/${filename}`;
}

/** Multer disk-storage option that writes files into the caller's tenant subfolder.
 *  structureId is decoded from the JWT in the request at upload time. */
export const tenantMulterOptions = (subfolder: string) => ({
  storage: diskStorage({
    destination: (req: any, _file: Express.Multer.File, cb: (e: any, d: string) => void) => {
      const structureId = extractStructureIdFromReq(req);
      const dir = buildTenantDir(structureId, subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: any, file: Express.Multer.File, cb: (e: any, n: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: (e: any, ok: boolean) => void) => {
    if (!file.mimetype.match(/^image\//)) {
      return cb(new BadRequestException('Seules les images sont autorisées'), false);
    }
    cb(null, true);
  },
});

/** Multer option for structure logos.
 *  - CREATE (no :id param) → public/logos/ (temp; service moves file after save)
 *  - UPDATE (:id param present) → public/tenants/{id}/logos/ */
export const structureLogoMulterOptions = () => ({
  storage: diskStorage({
    destination: (req: any, _file: Express.Multer.File, cb: (e: any, d: string) => void) => {
      const id = req.params?.id ? +req.params.id : null;
      const dir = id
        ? path.join(process.cwd(), 'public', 'tenants', String(id), 'logos')
        : path.join(process.cwd(), 'public', 'logos');
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req: any, file: Express.Multer.File, cb: (e: any, n: string) => void) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, cb: (e: any, ok: boolean) => void) => {
    if (!file.mimetype.match(/^image\//)) {
      return cb(new BadRequestException('Seules les images sont autorisées'), false);
    }
    cb(null, true);
  },
});
