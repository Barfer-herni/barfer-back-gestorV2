// Canonicaliza un nombre de producto a sus dimensiones esenciales
export function canonicalizeProductName(rawName: string, rawOption: string): string {
    const name = rawName.toUpperCase();
    const fullSearch = name + ' ' + (rawOption || '').toUpperCase();

    // Detectar animal
    const animal =
        fullSearch.includes('GATO') ? 'GATO' :
            fullSearch.includes('PERRO') ? 'PERRO' : null;

    // Detectar carne
    const carne =
        fullSearch.includes('POLLO') ? 'POLLO' :
            fullSearch.includes('VACA') ? 'VACA' :
                fullSearch.includes('CERDO') ? 'CERDO' :
                    fullSearch.includes('CORDERO') ? 'CORDERO' : null;

    // Detectar peso — busca en el nombre Y en la opción
    const pesoMatch = fullSearch.match(/(\d+)\s*KG/i);
    const peso = pesoMatch ? `${pesoMatch[1]}KG` : null;

    // BIG DOG es especial — no tiene animal
    if (name.includes('BIG DOG')) {
        if (carne) {
            return `BIG DOG (${peso ?? '15KG'}) (${carne})`;
        }
    }

    // HUESOS CARNOSOS — no tiene animal ni carne
    if (name.includes('HUESOS') || name.includes('CARNOSOS')) {
        return `HUESOS CARNOSOS (${peso ?? '5KG'})`;
    }

    // Caso general: BOX [ANIMAL] [CARNE] ([PESO])
    if (animal && carne && peso) {
        return `BOX ${animal} ${carne} (${peso})`;
    }

    // Si no pudo parsear, devuelve el nombre limpio tal cual
    return rawName.trim();
}

