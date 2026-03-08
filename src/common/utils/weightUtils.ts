/**
 * Utility to calculate weight in kilograms from product and option names.
 * Consolidates logic from Analytics, Express, and Wholesalers views.
 */

/**
 * Extracts weight in kilograms from product name or option name.
 * 
 * @param productName - The full name of the product (e.g., "BIG DOG POLLO", "BOX PERRO VACA")
 * @param optionName - The name of the selected option (e.g., "5KG", "10KG", "40GRS")
 * @returns The weight in KG, or 0 if not found or explicitly excluded.
 */
export const calculateItemWeight = (productName: string = '', optionName: string = ''): number => {
    const upperProductName = productName.toUpperCase();
    const upperOptionName = optionName.toUpperCase();
    const combinedName = `${upperProductName} ${upperOptionName}`;

    // 1. Exclusions: Items that should NOT sum to total kilos
    if (upperProductName.includes('OREJA')) {
        return 0;
    }

    // Small portions in grams (RAW section or small weights)
    const gramsMatch = combinedName.match(/(\d+)\s*GRS/i);
    if (gramsMatch && parseInt(gramsMatch[1], 10) < 1000) {
        return 0;
    }

    if (
        upperProductName.includes('CORNALITO') ||
        upperProductName.includes('GARRA') ||
        upperProductName.includes('CALDO') ||
        upperProductName.includes('COMPLEMENTO')
    ) {
        return 0;
    }

    // 2. Special case: BIG DOG (always 15kg if not already excluded)
    if (upperProductName.includes('BIG DOG')) {
        return 15;
    }

    // 3. Regex extraction (supports decimals)
    const weightRegex = /(\d+(?:\.\d+)?)\s*K?G/i;

    const optionMatch = upperOptionName.match(weightRegex);
    if (optionMatch && optionMatch[1]) {
        return parseFloat(optionMatch[1]);
    }

    const productMatch = upperProductName.match(weightRegex);
    if (productMatch && productMatch[1]) {
        return parseFloat(productMatch[1]);
    }

    // 4. Fallback rule: BOX
    if (upperProductName.includes('BOX')) {
        if (upperProductName.includes('GATO')) {
            return 5;
        }
        return 10; // Default for PERRO BOXes
    }

    return 0;
};
