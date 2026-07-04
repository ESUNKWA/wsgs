import { Injectable, BadRequestException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class PdfService {

  constructor(private readonly tenantContext: TenantContextService) {}

  async generateThermalPdf(html: string, fileName: string) {
    try {
      const structureId = this.tenantContext.hasContext() ? this.tenantContext.getStructureId() : null;

      const outputDir = structureId
        ? path.join(process.cwd(), 'public', 'tenants', String(structureId), 'pdfs')
        : path.join(process.cwd(), 'public', 'pdfs');

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        width: '80mm',
        printBackground: true,
        margin: { top: '2mm', bottom: '4mm', left: '0mm', right: '0mm' },
      });

      await browser.close();

      const urlPath = structureId
        ? `api/tenants/${structureId}/pdfs/${fileName}`
        : `api/pdfs/${fileName}`;

      return { success: true, path: `${String(process.env.BASE_URL)}/${urlPath}` };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  async generatePdf(html: string, fileName: string) {
    try {
      const structureId = this.tenantContext.hasContext() ? this.tenantContext.getStructureId() : null;

      const outputDir = structureId
        ? path.join(process.cwd(), 'public', 'tenants', String(structureId), 'pdfs')
        : path.join(process.cwd(), 'public', 'pdfs');

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' },
      });

      await browser.close();

      const urlPath = structureId
        ? `api/tenants/${structureId}/pdfs/${fileName}`
        : `api/pdfs/${fileName}`;

      return {
        success: true,
        path: `${String(process.env.BASE_URL)}/${urlPath}`,
      };

    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}
