export class ReferenceGeneratorHelper {
    static generate(prefix: string = 'ACH'): string {
        const datePart = new Date().toISOString().slice(0,10).replace(/-/g, '');
        const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 chiffres
        return `${prefix}-${datePart}-${randomPart}`;
    }
}
