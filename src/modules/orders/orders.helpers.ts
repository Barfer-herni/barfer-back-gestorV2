import { BadRequestException } from "@nestjs/common";

// funcion para normalizar el formato de la hora porque a veces viene como "18.30" o "18:30" o "18hs" o "18 30"
export function normalizeScheduleTime(schedule: string): string {
    if (!schedule) return schedule;

    // Evitar normalizar si ya está en formato correcto
    if (schedule.includes(':') && !schedule.includes('.')) {
        return schedule;
    }

    let normalized = schedule;

    // Primero: buscar patrones con espacios como "18 . 30", "19 . 45" y convertirlos
    normalized = normalized.replace(/(\d{1,2})\s*\.\s*(\d{1,2})/g, (match, hour, minute) => {
        const paddedMinute = minute.padStart(2, '0');
        return `${hour}:${paddedMinute}`;
    });

    // Segundo: buscar patrones de hora como "18.30", "19.45", "10.15", etc.
    normalized = normalized.replace(/(\d{1,2})\.(\d{1,2})/g, (match, hour, minute) => {
        const paddedMinute = minute.padStart(2, '0');
        return `${hour}:${paddedMinute}`;
    });

    // Tercero: buscar patrones de solo hora como "18hs", "19hs" y convertirlos a "18:00hs", "19:00hs"
    normalized = normalized.replace(/(\d{1,2})(?<!:\d{2})hs/g, '$1:00hs');

    // Cuarto: buscar patrones de 4 dígitos consecutivos (como "1830", "2000") y convertirlos a formato de hora
    normalized = normalized.replace(/(\d{1,2})(\d{2})(?=\s|hs|$|a|aprox)/g, (match, hour, minute) => {
        const minuteNum = parseInt(minute);
        if (minuteNum >= 0 && minuteNum <= 59) {
            return `${hour}:${minute}`;
        }
        return match;
    });

    return normalized;
}




// funcion para procesar los items de la orden y asegurar que el id sea un string
export function processOrderItems(items: any[]): any[] {
    return items.map(item => ({
        ...item,
        // Usar _id si existe, o asegurar id como string
        id: item._id ? item._id.toString() : (item.id ? item.id.toString() : ''),
    }));
}




// funcion para normalizar la fecha de entrega porque a veces viene como "2026-02-19T00:00:00.000Z" o "2026-02-19T00:00:00.000Z" o "2026-02-19T00:00:00.000Z"
export function normalizeDeliveryDay(dateInput: any): Date {
    if (!dateInput) return new Date();
    let date: Date;

    if (typeof dateInput === 'object' && '$date' in dateInput) {
        date = new Date(dateInput.$date);
    } else if (dateInput instanceof Date) {
        date = dateInput;
    } else {
        date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) throw new BadRequestException('Invalid date');
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return localDate;
}

export function validateAndNormalizePhone(phone: string): string | null {
    if (!phone) return null;

    let cleanPhone = phone.toString().trim();
    cleanPhone = cleanPhone.replace(/[^\d-]/g, '');
    let digitsOnly = cleanPhone.replace(/-/g, '');

    const prefixesToRemove = ['549', '54', '0', '0221'];

    for (const prefix of prefixesToRemove) {
        if (digitsOnly.startsWith(prefix)) {
            digitsOnly = digitsOnly.substring(prefix.length);
            break;
        }
    }

    if (digitsOnly.startsWith('9')) {
        digitsOnly = digitsOnly.substring(1);
    }

    if (digitsOnly.length < 7 || digitsOnly.length > 10) {
        return null;
    }

    if (digitsOnly.startsWith('221') || digitsOnly.startsWith('11') || digitsOnly.startsWith('15')) {
        return digitsOnly;
    }

    if (digitsOnly.length === 7) {
        return '221' + digitsOnly;
    }

    if (digitsOnly.length === 8) {
        return '11' + digitsOnly;
    }

    if (digitsOnly.length === 10) {
        return digitsOnly;
    }

    return null;
}
