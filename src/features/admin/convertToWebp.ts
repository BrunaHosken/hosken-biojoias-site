const MAX_EDGE = 2000;
const WEBP_QUALITY = 0.82;

export async function convertToWebp(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("image-decode-failed"));
      element.src = objectUrl;
    });

    const scale = Math.min(
      1,
      MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result?.type === "image/webp") resolve(result);
          else reject(new Error("webp-encoding-unsupported"));
        },
        "image/webp",
        WEBP_QUALITY,
      );
    });

    const name = file.name.replace(/\.[^.]+$/, "") || "foto";
    return new File([blob], `${name}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
