import { diskStorage } from 'multer';
import { extname } from 'path';

export const multerOptions = (destination: string) => ({
  storage: diskStorage({
    destination: (req, file, cb) => {
      cb(null, './uploads'+destination); // Utilisation du paramètre pour définir le dossier
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + extname(file.originalname)); // Nom unique
    },
  }),
  fileFilter: (req, file, cb) => {
    // Vérification du type de fichier
    if (!file.mimetype.match(/^image\//)) {
      return cb(new Error('Seules les images sont autorisées'), false);
    }
    cb(null, true);
  },
});
