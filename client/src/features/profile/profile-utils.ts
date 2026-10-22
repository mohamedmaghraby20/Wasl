export async function profileImageExtension(file: File): Promise<'jpg' | 'png' | 'webp'> {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new Error('profile-image-size');
  }
  const signature = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error ?? new Error('profile-image-read'));
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
  const isJpeg =
    file.type === 'image/jpeg' &&
    signature[0] === 0xff &&
    signature[1] === 0xd8 &&
    signature[2] === 0xff;
  const isPng =
    file.type === 'image/png' &&
    [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => signature[index] === byte);
  const isWebp =
    file.type === 'image/webp' &&
    String.fromCharCode(...signature.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...signature.slice(8, 12)) === 'WEBP';

  if (isJpeg) return 'jpg';
  if (isPng) return 'png';
  if (isWebp) return 'webp';
  throw new Error('profile-image-type');
}
