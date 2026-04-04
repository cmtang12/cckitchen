/**
 * Compresses an image to a target size while maintaining aspect ratio
 * @param dataUrl Base64 data URL of the image
 * @param maxWidth Maximum width in pixels (default 800)
 * @param maxHeight Maximum height in pixels (default 600)
 * @param quality JPEG quality 0-1 (default 0.7)
 * @returns Compressed image as base64 data URL
 */
export async function compressImage(
  dataUrl: string,
  maxWidth: number = 800,
  maxHeight: number = 600,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      console.log('[Image Compression]', {
        originalSize: (dataUrl.length / 1024).toFixed(2) + 'KB',
        compressedSize: (compressedDataUrl.length / 1024).toFixed(2) + 'KB',
        reduction: (((dataUrl.length - compressedDataUrl.length) / dataUrl.length) * 100).toFixed(1) + '%',
        dimensions: `${img.width}x${img.height} → ${width}x${height}`
      });

      resolve(compressedDataUrl);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for compression'));
    };

    img.src = dataUrl;
  });
}

/**
 * Fetches an image from a URL and converts it to a compressed base64 data URL
 */
export async function fetchAndCompressImage(
  url: string,
  maxWidth?: number,
  maxHeight?: number,
  quality?: number
): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    // Convert blob to data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    // Compress the image
    return await compressImage(dataUrl, maxWidth, maxHeight, quality);
  } catch (error) {
    console.error('[Image Fetch/Compress] Failed:', error);
    throw error;
  }
}
