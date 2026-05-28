export interface AddressLike {
  address?: string;
  city?: string;
  floorNumber?: string;
  departmentNumber?: string;
  betweenStreets?: string;
}

function normalizePart(value?: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Huella completa: calle + ciudad + piso + depto */
export function buildAddressFingerprint(addr?: AddressLike | null): string {
  if (!addr) return '';
  const parts = [
    normalizePart(addr.address),
    normalizePart(addr.city),
    normalizePart(addr.floorNumber),
    normalizePart(addr.departmentNumber),
  ].filter(Boolean);
  return parts.join('|');
}

/** Huella amplia: misma calle y ciudad (cuentas distintas, misma ubicación) */
export function buildStreetCityFingerprint(addr?: AddressLike | null): string {
  if (!addr) return '';
  const parts = [normalizePart(addr.address), normalizePart(addr.city)].filter(Boolean);
  return parts.join('|');
}

export function collectAddressFingerprints(
  addr?: AddressLike | null,
): string[] {
  const exact = buildAddressFingerprint(addr);
  const streetCity = buildStreetCityFingerprint(addr);
  const keys: string[] = [];
  if (exact) keys.push(exact);
  if (streetCity && streetCity !== exact) keys.push(streetCity);
  return keys;
}

export function isAddressBlacklisted(
  orderAddress: AddressLike | null | undefined,
  blacklistedKeys: Set<string>,
): boolean {
  if (!orderAddress || blacklistedKeys.size === 0) return false;
  const exact = buildAddressFingerprint(orderAddress);
  const streetCity = buildStreetCityFingerprint(orderAddress);
  return (
    (exact && blacklistedKeys.has(exact)) ||
    (streetCity && blacklistedKeys.has(streetCity))
  );
}
