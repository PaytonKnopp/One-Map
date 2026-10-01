import type { Map as MapLibreMap } from 'maplibre-gl';

import { FALLBACK_ICON_ID } from './style.ts';

/** `@2x` raster for a visually-24px icon, so it stays crisp on high-DPI screens. */
const RASTER_SIZE_PX = 48;
const RASTER_PIXEL_RATIO = 2;

const svgTextCache = new Map<string, Promise<string>>();

function fetchIconSvg(iconId: string): Promise<string> {
  const cached = svgTextCache.get(iconId);
  if (cached) return cached;

  const promise = fetch(`${import.meta.env.BASE_URL}icons/${iconId}.svg`).then((res) => {
    if (!res.ok) throw new Error(`icon "${iconId}" not found at assets/icons/${iconId}.svg`);
    return res.text();
  });
  svgTextCache.set(iconId, promise);
  return promise;
}

/**
 * Rasterizes an icon's source SVG (currentColor stroke/fill) in a specific
 * color onto a canvas. MapLibre's own SDF icon recoloring isn't used here
 * (see docs/DECISIONS.md "Labels" entry) — instead each distinct
 * (icon, color) pair gets its own pre-colored raster image, cached by id.
 */
async function rasterizeIcon(svgText: string, color: string): Promise<ImageData> {
  const colored = svgText.replace('<svg', `<svg style="color:${color}"`);
  const url = URL.createObjectURL(new Blob([colored], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = RASTER_SIZE_PX;
    canvas.height = RASTER_SIZE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    ctx.drawImage(img, 0, 0, RASTER_SIZE_PX, RASTER_SIZE_PX);
    return ctx.getImageData(0, 0, RASTER_SIZE_PX, RASTER_SIZE_PX);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The MapLibre image id a given (icon, color) pair is registered under. */
export function iconImageId(iconId: string, color: string): string {
  return `${iconId}:${color}`;
}

/**
 * Ensures `map.addImage` has been called for this (icon, color) pair,
 * falling back to the generic marker icon if `iconId` has no source SVG.
 * Returns the image id to use in an `icon-image` expression.
 */
export async function ensureIconImage(
  map: MapLibreMap,
  iconId: string,
  color: string,
): Promise<string> {
  const imageId = iconImageId(iconId, color);
  if (map.hasImage(imageId)) return imageId;

  let svgText: string;
  try {
    svgText = await fetchIconSvg(iconId);
  } catch {
    svgText = await fetchIconSvg(FALLBACK_ICON_ID);
  }

  const imageData = await rasterizeIcon(svgText, color);
  if (!map.hasImage(imageId)) {
    map.addImage(imageId, imageData, { pixelRatio: RASTER_PIXEL_RATIO });
  }
  return imageId;
}
