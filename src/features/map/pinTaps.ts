/** expo-maps pin events need iOS 18 (docs v58: onMarkerClick / onAnnotationClick "iOS 18.0+"). */
export function pinTapsUnsupported(os: string, version: string | number): boolean {
  return os === 'ios' && Number.parseInt(String(version), 10) < 18;
}
