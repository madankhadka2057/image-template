export const cloudinaryConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
};

export const uploadToCloudinary = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.uploadPreset || '');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Upload failed');
  }

  const data = await response.json();
  return data.secure_url;
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  const response = await fetch('/api/cloudinary/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ publicId }),
  });

  if (!response.ok) {
    throw new Error('Delete failed');
  }
};

export const generateAutofillUrl = (
  templatePublicId: string,
  userPublicId: string,
  placeholder: { x: number; y: number; width: number; height: number }
) => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  // Transformation logic:
  // 1. Take the user image
  // 2. Crop/Fill it to the placeholder size
  // 3. Overlay it onto the template at (x, y)
  // Note: Cloudinary coordinates for overlays are usually relative to center unless specified.
  // Using 'fl_layer_apply,g_north_west' for top-left positioning.

  return `https://res.cloudinary.com/${cloudName}/image/upload/` +
    `u_${userPublicId.replace(/\//g, ':')},w_${placeholder.width},h_${placeholder.height},c_fill,g_center/` +
    `fl_layer_apply,g_north_west,x_${placeholder.x},y_${placeholder.y}/` +
    `${templatePublicId}`;
};
