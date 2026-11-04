export type SupportedImageMime = 'image/jpeg' | 'image/png' | 'image/webp';

const ascii = (bytes: Uint8Array, start: number, length: number) =>
  String.fromCharCode(...bytes.slice(start, start + length));

export const inspectImageBytes = (bytes: Uint8Array): { mime: SupportedImageMime; width: number; height: number } => {
  if (bytes.length < 24) throw new Error('Image file is too small or damaged.');
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === 'PNG' && ascii(bytes, 12, 4) === 'IHDR') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { mime: 'image/png', width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WEBP') {
    const kind = ascii(bytes, 12, 4);
    if (kind === 'VP8X' && bytes.length >= 30) {
      return { mime: 'image/webp', width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) };
    }
    if (kind === 'VP8 ' && bytes.length >= 30 && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { mime: 'image/webp', width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
    }
    if (kind === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
      return { mime: 'image/webp', width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
    }
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0xff || marker === 0x00) { offset += 1; continue; }
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { mime: 'image/jpeg', height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
      }
      offset += 2 + length;
    }
  }
  throw new Error('Only valid JPG, PNG, or WebP images are supported.');
};

export const validateImageFile = async (file: File, maximumBytes: number) => {
  if (file.size < 24 || file.size > maximumBytes) throw new Error(`Image must be under ${Math.round(maximumBytes / 1048576)} MB.`);
  const details = inspectImageBytes(new Uint8Array(await file.arrayBuffer()));
  if (file.type !== details.mime) throw new Error('Image content does not match its file type.');
  if (details.width < 400 || details.height < 400 || details.width > 8000 || details.height > 8000 || details.width * details.height > 40000000) {
    throw new Error('Image dimensions must be between 400 and 8000 pixels, under 40 megapixels.');
  }
  return details;
};
