import type { Category } from "./data";

// Plain arithmetic the user sets — not an official estimate.
export const mealsNeeded = (adults: number, kids: number, perDay: number, days: number) => (adults + kids) * perDay * days;
export const FOOD_HELP: Category[] = ["pantry", "ministry", "meal-site", "food-bank", "snap-office", "wic-office"];
// Ordinary Google Maps directions link — needs no key.
export const driveUrl = (lat: number, lng: number) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
