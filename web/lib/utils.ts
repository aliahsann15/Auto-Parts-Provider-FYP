import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatReviewDateTime(isoDateString: string): string {
  const date = new Date(isoDateString);

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',   // “numeric” matches the allowed literal
    month: 'long',     // “long” is valid for month
    day: 'numeric'     // “numeric” is valid for day
  };

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',    // “numeric” for hours
    minute: '2-digit',  // “2-digit” for minutes
    hour12: true        // boolean for 12h clock
  };

  const formattedDate = date.toLocaleDateString(undefined, dateOptions);
  const formattedTime = date.toLocaleTimeString(undefined, timeOptions);

  return `${formattedDate}, ${formattedTime}`;
}
