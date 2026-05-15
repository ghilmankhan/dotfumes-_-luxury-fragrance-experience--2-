export const createSlipPreviewUrl = (file: File) =>
  file.type.startsWith('image/') ? URL.createObjectURL(file) : '';

export const revokeSlipPreviewUrl = (previewUrl: string) => {
  if (!previewUrl) {
    return;
  }

  URL.revokeObjectURL(previewUrl);
};

export const isImageSlip = (mimeType: string) => mimeType.startsWith('image/');
