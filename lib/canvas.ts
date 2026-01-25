export const mergeImages = async (
  userImageUrl: string,
  templateUrl: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Failed to get canvas context'));
      return;
    }

    let loadedImages = 0;
    const userImage = new Image();
    const templateImage = new Image();

    userImage.crossOrigin = 'anonymous';
    templateImage.crossOrigin = 'anonymous';

    const onImageLoad = () => {
      loadedImages++;
      if (loadedImages === 2) {
        // Set canvas size to template dimensions
        canvas.width = templateImage.width;
        canvas.height = templateImage.height;

        // Draw user image first (background)
        const scale = Math.max(
          canvas.width / userImage.width,
          canvas.height / userImage.height
        );
        const scaledWidth = userImage.width * scale;
        const scaledHeight = userImage.height * scale;
        const x = (canvas.width - scaledWidth) / 2;
        const y = (canvas.height - scaledHeight) / 2;

        ctx.drawImage(userImage, x, y, scaledWidth, scaledHeight);

        // Draw template on top
        ctx.drawImage(templateImage, 0, 0);

        // Convert canvas to image URL
        const imageUrl = canvas.toDataURL('image/png');
        resolve(imageUrl);
      }
    };

    userImage.onload = onImageLoad;
    templateImage.onload = onImageLoad;

    userImage.onerror = () => reject(new Error('Failed to load user image'));
    templateImage.onerror = () => reject(new Error('Failed to load template image'));

    userImage.src = userImageUrl;
    templateImage.src = templateUrl;
  });
};

export const downloadImage = (imageUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const canvasToBlob = async (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to convert canvas to blob'));
      }
    }, 'image/png');
  });
};
