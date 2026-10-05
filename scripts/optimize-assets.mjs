import sharp from "sharp";
await sharp("legacy/assets/hero-beautyhub.png")
  .resize({ width: 1800, withoutEnlargement: true })
  .webp({ quality: 82 })
  .toFile("public/assets/hero-beautyhub.webp");
