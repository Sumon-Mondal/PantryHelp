// Raw hex values for canvas/WebGL renderers (MapLibre, three.js) that can't read CSS variables.
// Mirrors the Daylight Glass tokens in styles.css.
export const HEX = {
  paper: "#F7F8F2",
  paperDeep: "#EEF1E6",
  evergreen: "#123B32",
  evergreen80: "#2F5A50",
  evergreen60: "#4A6B62",
  evergreen40: "#8AA39C",
  leaf: "#76AD3B",
  leafDeep: "#3F6E14",
  sky: "#A9DCF4",
  skyDeep: "#22698F",
  aqua: "#42B5B1",
  aquaDeep: "#11655F",
  citrus: "#F4B544",
  citrusDeep: "#7E5000",
  tomato: "#B23A22",
  skyHorizon: "#EAF7FD",
  skyZenith: "#6FC3E9",
  sun: "#FFE6B8",
  white: "#FFFFFF",
};

export const CATEGORY_HEX: Record<string, string> = {
  pantry: HEX.leafDeep,
  ministry: "#6B4F8F",
  "meal-site": HEX.tomato,
  "snap-office": HEX.skyDeep,
  "wic-office": HEX.aquaDeep,
  "food-bank": HEX.citrusDeep,
};
