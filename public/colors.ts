export const hexToRgb = (hex:string):{r:number, g:number, b:number} => {
    let alpha = false,
      hexa = hex.slice(hex.startsWith('#') ? 1 : 0);
    if (hexa.length === 3) hexa = [...hexa].map(x => x + x).join('');
    else if (hexa.length === 8) alpha = true;
    const h = parseInt(hexa, 16);

    return {
        'r':(h >>> (alpha ? 24 : 16)),
        'g':((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)),
        'b':((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0))
    }
  };


  export const rgbToHsl = (r:number, g:number, b:number) :{h:number, s:number, l:number} => {
    r /= 255;
    g /= 255;
    b /= 255;
    const l = Math.max(r, g, b);
    const s = l - Math.min(r, g, b);
    const h = s
      ? l === r
        ? (g - b) / s
        : l === g
        ? 2 + (b - r) / s
        : 4 + (r - g) / s
      : 0;
    return {
      "h":60 * h < 0 ? 60 * h + 360 : 60 * h,
      "s":100 * (s ? (l <= 0.5 ? s / (2 * l - s) : s / (2 - (2 * l - s))) : 0),
      "l":(100 * (2 * l - s)) / 2,
    };
  };

export const hexaRgbToHsl = (hexa:string):{h:number, s:number, l:number} => {
    let rgb = hexToRgb(hexa);
    return rgbToHsl(rgb.r,rgb.g,rgb.b);
}

export const isDark = (hexa:string): boolean => {
    const hsl = hexaRgbToHsl(hexa);
    console.log(`   HSL : ${hsl.l} ${hsl.l < 50}`);
    return hsl.l < 50;
}