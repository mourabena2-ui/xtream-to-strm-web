import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function formatDateTime(dateString: string | null | undefined) {
    if (!dateString) return 'Never';
    try {
        // Display strictly as sent by server (naive or ISO) without browser TZ shifting
        return dateString.replace('T', ' ').split('.')[0].replace('Z', '');
    } catch (e) {
        return dateString || 'Never';
    }
}
