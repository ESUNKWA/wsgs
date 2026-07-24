import { Injectable, BadRequestException, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { TenantContextService } from 'src/tenant/tenant-context.service';

@Injectable()
export class PdfService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PdfService.name);
  private browser: puppeteer.Browser | null = null;

  constructor(private readonly tenantContext: TenantContextService) {}

  async onModuleInit() {
    await this.launchBrowser();
  }

  async onModuleDestroy() {
    await this.browser?.close();
  }

  private async launchBrowser() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=fr-FR', '--font-render-hinting=none'],
    });
    this.logger.log('Puppeteer browser started');
  }

  private async getPage(): Promise<puppeteer.Page> {
    if (!this.browser || !this.browser.connected) {
      this.logger.warn('Browser disconnected, restarting…');
      await this.launchBrowser();
    }
    return this.browser!.newPage();
  }

  async generateThermalPdf(html: string, fileName: string) {
    try {
      const structureId = this.tenantContext.hasContext() ? this.tenantContext.getStructureId() : null;

      const outputDir = structureId
        ? path.join(process.cwd(), 'public', 'tenants', String(structureId), 'pdfs')
        : path.join(process.cwd(), 'public', 'pdfs');

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const page = await this.getPage();
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9' });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });

      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        width: '72mm',
        printBackground: true,
        margin: { top: '0', bottom: '0', left: '0', right: '0' },
      });

      await page.close();

      const urlPath = structureId
        ? `api/tenants/${structureId}/pdfs/${fileName}`
        : `api/pdfs/${fileName}`;

      return { success: true, path: `${String(process.env.BASE_URL)}/${urlPath}` };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  async generatePdfBuffer(html: string): Promise<Buffer> {
    const page = await this.getPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    const buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' },
    });
    await page.close();
    return Buffer.from(buffer);
  }

  async generatePdf(html: string, fileName: string) {
    try {
      const structureId = this.tenantContext.hasContext() ? this.tenantContext.getStructureId() : null;

      const outputDir = structureId
        ? path.join(process.cwd(), 'public', 'tenants', String(structureId), 'pdfs')
        : path.join(process.cwd(), 'public', 'pdfs');

      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const page = await this.getPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '10mm', right: '10mm' },
      });

      await page.close();

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
