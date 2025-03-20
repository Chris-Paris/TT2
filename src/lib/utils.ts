import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Coordinates } from "@/types";
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGoogleMapsUrl(location: { title: string; coordinates?: Coordinates }) {
  if (!location.coordinates) return '';
  const query = encodeURIComponent(location.title);
  const { lat, lng } = location.coordinates;
  return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${lat},${lng}`;
}

export function extractTimePrefix(activity: string): string {
  const frenchPattern = /(Matin: \d{1,2}h\d{2} -|Après-midi: \d{1,2}h\d{2} -|Soir: \d{1,2}h\d{2} -)/;
  const englishPattern = /(Morning: \d{1,2}:\d{2} [AP]M -|Afternoon: \d{1,2}:\d{2} [AP]M -|Evening: \d{1,2}:\d{2} [AP]M -)/;
  
  const match = activity.match(frenchPattern) || activity.match(englishPattern);
  return match ? match[0] : '';
}