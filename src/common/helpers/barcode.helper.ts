import * as bwipjs from 'bwip-js';

export class BarcodeHelper {
  /**
   * Génère un code EAN-13 unique basé sur un préfixe structure + timestamp.
   * Format : {prefixe 4 chiffres}{horodatage 8 chiffres}{chiffre contrôle}
   */
  static generateEan13(structureId: number): string {
    const prefix = String(structureId).padStart(4, '0').slice(-4);
    const ts     = String(Date.now()).slice(-8);
    const body   = `${prefix}${ts}`;           // 12 chiffres
    const check  = BarcodeHelper.ean13Check(body);
    return `${body}${check}`;
  }

  static ean13Check(body: string): number {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(body[i], 10) * (i % 2 === 0 ? 1 : 3);
    }
    return (10 - (sum % 10)) % 10;
  }

  static validateEan13(code: string): boolean {
    if (!/^\d{13}$/.test(code)) return false;
    const body  = code.slice(0, 12);
    const check = parseInt(code[12], 10);
    return BarcodeHelper.ean13Check(body) === check;
  }

  /** Retourne l'image du code-barres encodée en base64 PNG */
  static async toBase64Png(code: string): Promise<string> {
    const png = await bwipjs.toBuffer({
      bcid:        'ean13',
      text:        code,
      scale:       3,
      height:      12,
      includetext: true,
      textxalign:  'center',
    });
    return `data:image/png;base64,${png.toString('base64')}`;
  }
}
