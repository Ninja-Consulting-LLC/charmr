import ImageResizer from 'react-native-image-resizer';
import {compressImage, compressImages} from '../imageCompression';

jest.mock('react-native-image-resizer', () => ({
  createResizedImage: jest.fn(),
}));

describe('imageCompression', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should compress a single image correctly', async () => {
    const mockResizedImage = {
      uri: 'file://compressed-image.jpg',
      width: 720,
      height: 480,
    };

    const mockBase64 = 'data:image/jpeg;base64,mockBase64String';

    // Mock ImageResizer response
    (ImageResizer.createResizedImage as jest.Mock).mockResolvedValue(
      mockResizedImage,
    );

    // Mock fetch and blob conversion
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['test-image-data'])),
    });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onload: jest.fn(),
      result: mockBase64,
    };
    global.FileReader = jest.fn(() => mockFileReader) as any;

    const result = await compressImage('file://test-image.jpg');

    expect(ImageResizer.createResizedImage).toHaveBeenCalledWith(
      'file://test-image.jpg',
      720,
      720,
      'JPEG',
      70,
      0,
      undefined,
      false,
      {mode: 'contain', onlyScaleDown: true},
    );

    expect(result).toEqual({
      uri: mockResizedImage.uri,
      base64: mockBase64,
      width: mockResizedImage.width,
      height: mockResizedImage.height,
    });
  });

  it('should compress multiple images in parallel', async () => {
    const mockResizedImage = {
      uri: 'file://compressed-image.jpg',
      width: 720,
      height: 480,
    };

    const mockBase64 = 'data:image/jpeg;base64,mockBase64String';

    // Mock ImageResizer response
    (ImageResizer.createResizedImage as jest.Mock).mockResolvedValue(
      mockResizedImage,
    );

    // Mock fetch and blob conversion
    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['test-image-data'])),
    });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: jest.fn(),
      onload: jest.fn(),
      result: mockBase64,
    };
    global.FileReader = jest.fn(() => mockFileReader) as any;

    const imageUris = ['file://test-image1.jpg', 'file://test-image2.jpg'];

    const results = await compressImages(imageUris);

    expect(ImageResizer.createResizedImage).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    results.forEach(result => {
      expect(result).toEqual({
        uri: mockResizedImage.uri,
        base64: mockBase64,
        width: mockResizedImage.width,
        height: mockResizedImage.height,
      });
    });
  });

  it('should handle errors during compression', async () => {
    (ImageResizer.createResizedImage as jest.Mock).mockRejectedValue(
      new Error('Compression failed'),
    );

    await expect(compressImage('file://test-image.jpg')).rejects.toThrow(
      'Compression failed',
    );
  });
});
