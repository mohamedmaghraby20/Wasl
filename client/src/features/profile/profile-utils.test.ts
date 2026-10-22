import { describe, expect, it } from 'vitest';
import { profileImageExtension } from './profile-utils';

describe('profileImageExtension', () => {
  it('accepts a PNG only when the content signature matches', async () => {
    const image = new File(
      [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0])],
      'profile.png',
      { type: 'image/png' },
    );

    await expect(profileImageExtension(image)).resolves.toBe('png');
  });

  it('rejects a fake MIME type and an unsupported image format', async () => {
    const image = new File([new Uint8Array([1, 2, 3, 4])], 'profile.png', { type: 'image/png' });

    await expect(profileImageExtension(image)).rejects.toThrow('profile-image-type');
  });
});
