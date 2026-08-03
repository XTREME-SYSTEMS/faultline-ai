import React, { useMemo } from "react";
import { Image } from "@/components/ui/image";

function seededRand(seed) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

function fleckLayers(seed, count, sizeRange, toneRange) {
  const rand = seededRand(seed);
  const layers = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() * 100).toFixed(1);
    const y = (rand() * 100).toFixed(1);
    const r = (sizeRange[0] + rand() * (sizeRange[1] - sizeRange[0])).toFixed(2);
    const tone = toneRange[Math.floor(rand() * toneRange.length)];
    layers.push(`radial-gradient(circle at ${x}% ${y}%, ${tone} 0 ${r}px, transparent ${(+r + 0.5).toFixed(2)}px)`);
  }
  return layers.join(", ");
}

/**
 * Renders a color-chart swatch. When the color has an official manufacturer
 * product photo (image_url), that exact photo is shown. Otherwise a CSS
 * procedural texture is generated as a fallback (used for glitter).
 */
export default function ColorSwatch({ color, system, className = "" }) {
  const hex = color.hex || "#888";
  const seed = color.code || color.color_name || hex;

  const style = useMemo(() => {
    if (system !== "glitter") {
      return { background: `linear-gradient(180deg, rgba(255,255,255,0.16) 0%, ${hex} 30%, ${hex} 100%)` };
    }
    const sparks = fleckLayers(
      seed,
      40,
      [0.5, 1.6],
      ["rgba(255,255,255,0.95)", "rgba(255,255,255,0.6)", "rgba(255,255,255,0.35)", "rgba(0,0,0,0.25)"]
    );
    return {
      background: [
        sparks,
        `radial-gradient(circle at 50% 40%, rgba(255,255,255,0.25), transparent 60%)`,
        `linear-gradient(120deg, ${hex}, rgba(255,255,255,0.18) 50%, ${hex})`,
      ].join(", "),
    };
  }, [hex, system, seed]);

  if (color.image_url) {
    return <Image src={color.image_url} fittingType="fill" className={`block w-full ${className}`} />;
  }
  return <div className={className} style={style} />;
}