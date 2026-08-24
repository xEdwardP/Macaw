const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const env = require("./env");
const logger = require("./logger");
const {
  BadRequestError,
  ServiceUnavailableError,
} = require("../shared/errors/AppError");
const ERROR_CODES = require("../shared/errors/codes");

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

if (env.uploadsEnabled)
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.UPLOAD_MAX_BYTES, files: 1 },
  fileFilter: (req, file, callback) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) return callback(null, true);

    return callback(
      new BadRequestError(
        ERROR_CODES.UPLOAD_TYPE_NOT_ALLOWED,
        "Solo se admiten imágenes PNG, JPG, WEBP o GIF",
      ),
    );
  },
});

const uploadImage = (file, { folder, publicId, width }) => {
  if (!env.uploadsEnabled)
    throw new ServiceUnavailableError(
      ERROR_CODES.UPLOAD_NOT_CONFIGURED,
      "La subida de imágenes no está configurada en este servidor",
    );

  if (!file)
    throw new BadRequestError(
      ERROR_CODES.UPLOAD_FILE_REQUIRED,
      "Adjunta una imagen",
    );

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_FOLDER}/${folder}`,
        public_id: publicId,
        overwrite: true,
        invalidate: true,
        resource_type: "image",
        transformation: [
          { width, height: width, crop: "fill", gravity: "auto" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error({ err: error.message, folder }, "Fallo al subir imagen");
          return reject(
            new ServiceUnavailableError(
              ERROR_CODES.UPLOAD_FAILED,
              "No pudimos subir la imagen. Intenta de nuevo.",
            ),
          );
        }

        return resolve(result.secure_url);
      },
    );

    stream.end(file.buffer);
  });
};

module.exports = { imageUpload, uploadImage, ALLOWED_TYPES };
