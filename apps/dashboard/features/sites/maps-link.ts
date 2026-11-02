type Place = { address: string | null; latitude: string | null; longitude: string | null };

/**
 * A Google Maps search for the site (task 054): its coordinates when set, else its address; null with
 * neither. Opens in the maps app on phones.
 */
export function mapsLink(place: Place): string | null {
  const query =
    place.latitude !== null && place.longitude !== null ? `${place.latitude},${place.longitude}` : place.address;
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}
