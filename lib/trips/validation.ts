export interface TripFields {
  eventName: string;
  eventLocation: string;
  checkin: string;
  checkout: string;
}

export function validateTrip(fields: TripFields): string | null {
  if (!fields.eventName.trim()) return "Enter a trip name.";
  if (!fields.eventLocation.trim()) return "Enter a destination.";
  if (!fields.checkin) return "Choose a check-in date.";
  if (!fields.checkout) return "Choose a check-out date.";
  if (fields.checkout <= fields.checkin) return "Check out must be after check in.";
  return null;
}
