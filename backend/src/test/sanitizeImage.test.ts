import {describe, expect, it} from '@jest/globals';
import {sanitizeImage} from '../utils/sanitizeImage';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('sanitizeImage', () => {
  it('resizes and returns metadata for tiny PNG', async () => {
    const out = await sanitizeImage(tinyPng, {
      stripMetadata: true,
      maxSizeBytes: 500_000,
    });
    expect(out.buffer.length).toBeGreaterThan(0);
    expect(out.format).toBeTruthy();
    expect(out.width).toBeGreaterThan(0);
  });

  it('throws when image cannot meet max size', async () => {
    await expect(
      sanitizeImage(tinyPng, {maxSizeBytes: 1, stripMetadata: false}),
    ).rejects.toThrow(/could not be compressed/i);
  });
});
