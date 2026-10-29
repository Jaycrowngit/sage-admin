/**
 * Turns a picked image file into a small square JPEG data URL for upload.
 * Images are centre-cropped and scaled down in the browser so the backend
 * only ever stores a few dozen KB per profile picture.
 */
export async function imageFileToAvatar(file: File, size = 256): Promise<string> {
  if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("That image is too large. Choose one under 10 MB.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("That image could not be opened. Try a JPG or PNG."));
      el.src = objectUrl;
    });

    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const out = Math.min(size, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image.");

    // JPEG has no transparency; give transparent PNGs a white background instead of black
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, out, out);
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    );

    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
