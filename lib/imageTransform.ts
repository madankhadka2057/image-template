/**
 * Image Transform Utility
 * Handles crop, rotate, and transform operations on canvas
 */

export interface CropArea {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Transform {
    x: number;
    y: number;
    scale: number;
    rotation: number; // in degrees
}

/**
 * Apply crop to an image and return cropped canvas
 */
export function cropImage(
    image: HTMLImageElement,
    cropArea: CropArea
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = cropArea.width;
    canvas.height = cropArea.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        cropArea.width,
        cropArea.height
    );

    return canvas;
}

/**
 * Rotate an image by specified degrees
 */
export function rotateImage(
    image: HTMLImageElement | HTMLCanvasElement,
    degrees: number
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const radians = (degrees * Math.PI) / 180;

    // Calculate new canvas size after rotation
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));
    canvas.width = image.width * cos + image.height * sin;
    canvas.height = image.width * sin + image.height * cos;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Move to center, rotate, then draw
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);

    return canvas;
}

/**
 * Apply transform (scale, rotate, translate) to canvas context
 */
export function applyTransform(
    ctx: CanvasRenderingContext2D,
    transform: Transform,
    centerX: number,
    centerY: number
) {
    ctx.save();

    // Translate to center point
    ctx.translate(centerX, centerY);

    // Apply rotation
    if (transform.rotation !== 0) {
        ctx.rotate((transform.rotation * Math.PI) / 180);
    }

    // Apply scale
    if (transform.scale !== 1) {
        ctx.scale(transform.scale, transform.scale);
    }

    // Apply translation
    ctx.translate(transform.x, transform.y);

    // Translate back
    ctx.translate(-centerX, -centerY);
}

/**
 * Reset transform
 */
export function resetTransform(ctx: CanvasRenderingContext2D) {
    ctx.restore();
}

/**
 * Get default transform
 */
export function getDefaultTransform(): Transform {
    return {
        x: 0,
        y: 0,
        scale: 1,
        rotation: 0,
    };
}
