/** Wire types of mi-vueltica-api (the response interfaces under src/presentation/http in that repo). Hand-copied; keep in sync with its OpenAPI document. */
export type ContentStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
export type TargetAudience = 'EVERYONE' | 'CHILDREN' | 'ADULTS' | 'SENIORS';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  surnames: string;
  ageRange: string | null;
  role: UserRole;
}
export interface AuthDto {
  user: UserDto;
  token: string;
  expiresIn: string;
}
export interface DayRange {
  open: string;
  close: string;
}
export type OpeningHoursDto = Partial<Record<'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday', DayRange[]>>;

export interface PlaceDto {
  id: string;
  cantonId: number;
  categoryId: number;
  sourceId: string | null;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  openingHours: OpeningHoursDto | null;
  targetAudience: TargetAudience;
  status: ContentStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface PlaceDetailDto extends PlaceDto {
  photos: { id: string; url: string; position: number }[];
  averageRating: number | null;
  reviewCount: number;
  isFavorite?: boolean;
}
export interface EventDto {
  id: string;
  placeId: string | null;
  categoryId: number;
  sourceId: string | null;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  targetAudience: TargetAudience;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}
export interface EventDetailDto extends EventDto {
  place: { id: string; name: string; cantonId: number; latitude: number; longitude: number; address: string | null; status: ContentStatus } | null;
}
export interface CategoryDto {
  id: number;
  name: string;
}
export interface SubmissionDto {
  id: string;
  userId: string;
  type: 'PLACE' | 'EVENT';
  data: Record<string, unknown>;
  status: ContentStatus;
  reviewedById: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
export interface FavoriteDto {
  place: PlaceDto;
  createdAt: string;
}
