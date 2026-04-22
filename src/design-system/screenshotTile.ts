/** Shared with `ImageSelector` and `ResponseGenerator` so layout stays aligned. */
export const SCREENSHOT_PHONE_ASPECT_RATIO = 9 / 19.5;

export function getScreenshotTileDimensions(windowHeight: number): {
  tileWidth: number;
  tileHeight: number;
} {
  const tileHeight = Math.min(windowHeight * 0.58, 540);
  const tileWidth = tileHeight * SCREENSHOT_PHONE_ASPECT_RATIO;
  return {tileWidth, tileHeight};
}
