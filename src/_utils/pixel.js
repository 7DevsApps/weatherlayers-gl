import {mixAll} from './mix.js';
import {ImageInterpolation} from './image-interpolation.js';

/** @typedef {import('./data').TextureData} TextureData */

/**
 * @param {TextureData} image
 * @param {number} x
 * @param {number} y
 * @return {number[]}
 */
function getPixel(image, x, y) {
  const { data, width, height } = image;
  const bandsCount = data.length / (width * height);

  return new Array(bandsCount).fill(undefined).map((_, band) => {
    return data[(x + y * width) * bandsCount + band];
  });
}

/**
 * texture2D with software bilinear filtering
 * see https://gamedev.stackexchange.com/questions/101953/low-quality-bilinear-sampling-in-webgl-opengl-directx
 * @param {TextureData} image
 * @param {GeoJSON.Position} point
 * @return {number[]}
 */
function getPixelInterpolateLinear(image, point) {
  const [x, y] = point;
  const floorX = Math.floor(x);
  const floorY = Math.floor(y);
  const fractX = x % 1;
  const fractY = y % 1;

  const topLeft = getPixel(image, floorX, floorY);
  const topRight = getPixel(image, floorX + 1, floorY);
  const bottomLeft = getPixel(image, floorX, floorY + 1);
  const bottomRight = getPixel(image, floorX + 1, floorY + 1);
  return mixAll(mixAll(topLeft, topRight, fractX), mixAll(bottomLeft, bottomRight, fractX), fractY);
}

/**
 * @param {TextureData} image
 * @param {GeoJSON.Position} point
 * @return {number[]}
 */
function getPixelNearest(image, point) {
  const [x, y] = point;
  const roundX = Math.round(x);
  const roundY = Math.round(y);
  return getPixel(image, roundX, roundY);
}

/**
 * @param {TextureData} image
 * @param {ImageInterpolation} imageInterpolation
 * @param {GeoJSON.Position} point
 * @return {number[]}
 */
function getPixelFilter(image, imageInterpolation, point) {
  // Offset
  // Test case: Gibraltar (36, -5.5)
  const offsetPoint = [point[0], point[1] - 0.5];

  if (imageInterpolation === ImageInterpolation.CUBIC) {
    return getPixelInterpolateLinear(image, offsetPoint); // TODO: implement cubic? or don't interpolate at all, use nearest only?
  } else if (imageInterpolation === ImageInterpolation.LINEAR) {
    return getPixelInterpolateLinear(image, offsetPoint);
  } else {
    return getPixelNearest(image, offsetPoint);
  }
}

/**
 * @param {TextureData} image
 * @param {TextureData | null} image2
 * @param {ImageInterpolation} imageInterpolation
 * @param {number} imageWeight
 * @param {GeoJSON.Position} point
 * @return {number[]}
 */
export function getPixelInterpolate(image, image2, imageInterpolation, imageWeight, point) {
  if (image2 && imageWeight > 0) {
    const pixel = getPixelFilter(image, imageInterpolation, point);
    const pixel2 = getPixelFilter(image2, imageInterpolation, point);
    return mixAll(pixel, pixel2, imageWeight);
  } else {
    return getPixelFilter(image, imageInterpolation, point);
  }
}