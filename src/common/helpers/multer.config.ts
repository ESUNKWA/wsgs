// multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';

// Configuration des options pour multer
export const multerOptions = {
  storage: diskStorage({
    destination: './uploads/produits',  // Dossier où les images seront stockées
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname));  // Nom unique pour chaque fichier
    },
  }),
  fileFilter: (req, file, cb) => {
    // Vérification du type de fichier
    if (!file.mimetype.match(/^image\//)) {
      return cb(new Error('Seules les images sont autorisées'), false);
    }
    cb(null, true);
  },
};
