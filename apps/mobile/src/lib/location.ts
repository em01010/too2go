import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

export interface Coords {
  lat: number;
  lng: number;
}

/** Centro de Tegucigalpa: se usa cuando no hay permiso de ubicación. */
export const TEGUCIGALPA: Coords = { lat: 14.0723, lng: -87.1921 };

export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function fetchLocation(): Promise<Coords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== Location.PermissionStatus.GRANTED) throw new Error('location_denied');
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  return { lat: pos.coords.latitude, lng: pos.coords.longitude };
}

export function useUserLocation() {
  const q = useQuery({
    queryKey: ['user-location'],
    queryFn: fetchLocation,
    staleTime: 5 * 60_000,
    retry: false,
  });
  return {
    coords: q.data ?? null,
    denied: q.isError,
    asking: q.isPending,
    request: () => void q.refetch(),
  };
}
