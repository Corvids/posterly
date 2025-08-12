import { useState, useCallback } from 'react';

interface PosterizationOptions {
  levels: number;
  blackAndWhite: boolean;
  flipVertical: boolean;
}

export const useImagePosterization = () => {
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const posterizeImage = useCallback(async (
    file: File,
    options: PosterizationOptions
  ) => {
    setIsProcessing(true);
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const { levels, blackAndWhite, flipVertical } = options;
      const step = 255 / (levels - 1);

      for (let i = 0; i < data.length; i += 4) {
        if (blackAndWhite) {
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          const posterized = Math.round(gray / step) * step;
          
          data[i] = posterized;
          data[i + 1] = posterized;
          data[i + 2] = posterized;
        } else {
          data[i] = Math.round(data[i] / step) * step;
          data[i + 1] = Math.round(data[i + 1] / step) * step;
          data[i + 2] = Math.round(data[i + 2] / step) * step;
        }
      }

      if (flipVertical) {
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width / 2; x++) {
            const leftIndex = (y * canvas.width + x) * 4;
            const rightIndex = (y * canvas.width + (canvas.width - 1 - x)) * 4;
            
            for (let c = 0; c < 4; c++) {
              const temp = data[leftIndex + c];
              data[leftIndex + c] = data[rightIndex + c];
              data[rightIndex + c] = temp;
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      const processedUrl = URL.createObjectURL(blob);
      setProcessedImageUrl(processedUrl);

      URL.revokeObjectURL(imageUrl);
      
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const resetImage = useCallback(() => {
    if (processedImageUrl) {
      URL.revokeObjectURL(processedImageUrl);
      setProcessedImageUrl(null);
    }
  }, [processedImageUrl]);

  return {
    processedImageUrl,
    isProcessing,
    posterizeImage,
    resetImage,
  };
};
