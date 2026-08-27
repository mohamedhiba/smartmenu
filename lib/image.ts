export type DownscaledImage = {
  base64: string;
  mimeType: string;
};

function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode image file."));
    image.src = url;
  });
}

function fitDimensions(width: number, height: number, maxSide = 1024) {
  const ratio = Math.min(maxSide / width, maxSide / height, 1);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function downscaleToBase64(file: File): Promise<DownscaledImage> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImageFromUrl(objectUrl);
    const nextSize = fitDimensions(image.naturalWidth || image.width, image.naturalHeight || image.height);

    const canvas = document.createElement("canvas");
    canvas.width = nextSize.width;
    canvas.height = nextSize.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context unavailable.");
    }

    context.fillStyle = "#000000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
    const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, "");

    return {
      base64,
      mimeType: "image/jpeg",
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
