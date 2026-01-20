import { Injectable, BadRequestException } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfService {

  async generatePdf(html: string, fileName: string) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const outputDir = path.join(process.cwd(), 'public/pdfs');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '10mm',
          right: '10mm',
        },
      });

      await browser.close();

      return {
        success: true,
        path: `/api/pdfs/${fileName}`,
      };

    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
