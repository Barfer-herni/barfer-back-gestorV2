export interface ProductToCalculate {
    product: string;
    section: string;
    weight?: string;
}

export function calculateSalesFromOrders(product: ProductToCalculate, orders: any[]): number {
    let totalQuantity = 0;
    const sectionUpper = (product.section || '').toUpperCase();
    let productName = (product.product || '').toUpperCase().trim();

    if (sectionUpper && productName.startsWith(sectionUpper)) {
        const originalProductName = productName;
        productName = productName.substring(sectionUpper.length).trim();
    }

    const productWeight = product.weight ? (product.weight || '').toUpperCase().trim().replace(/\s+/g, '') : null;

    orders.forEach((order, orderIndex) => {
        if (!order.items) return;

        order.items.forEach((item: any, itemIndex: number) => {
            const itemProductBase = (item.name || '').toUpperCase().trim();
            const itemOption = (item.options?.[0]?.name || '').toUpperCase().trim();
            const isBigDogItem = itemProductBase.includes('BIG DOG');
            const isBigDogStock = productName.includes('BIG DOG');

            // 1. Validación de sección (Perro vs Gato)
            if (!sectionUpper.includes('OTROS')) {
                if (sectionUpper.includes('GATO')) {
                    if (!itemProductBase.includes('GATO')) return;
                } else if (sectionUpper.includes('PERRO')) {
                    if (itemProductBase.includes('GATO')) return;

                    // Regla: Si el ítem es BIG DOG, el stock debe ser BIG DOG.
                    // Si el ítem NO es BIG DOG, el stock NO debe ser BIG DOG.
                    if (isBigDogStock && !isBigDogItem) return;
                    if (!isBigDogStock && isBigDogItem) return;
                }
            }

            let isMatch = false;

            // CASO ESPECIAL: BIG DOG
            if (isBigDogItem && isBigDogStock) {
                const flavors = ['POLLO', 'VACA', 'CORDERO', 'CERDO', 'CONEJO', 'PAVO', 'MIX'];
                const stockFullIdent = `${productName} ${productWeight || ''}`.toUpperCase();

                // Prioridad: Matchear sabor desde las opciones
                if (item.options && item.options.length > 0) {
                    const flavorOption = item.options.find((opt: any) =>
                        flavors.some(f => (opt.name || '').toUpperCase().includes(f))
                    );

                    if (flavorOption) {
                        const optValue = flavorOption.name.toUpperCase().trim();
                        isMatch = stockFullIdent.includes(optValue);
                    }
                }

                // Fallback: Si no hay match por opciones de sabor, intentar por el nombre del ítem
                if (!isMatch) {
                    const itemFullIdent = itemProductBase.toUpperCase();
                    const itemFlavor = flavors.find(f => itemFullIdent.includes(f));
                    const stockFlavor = flavors.find(f => stockFullIdent.includes(f));

                    const cleanItem = itemProductBase.replace(/\s*\(?\d+KG\)?/gi, '').trim();
                    const cleanStock = productName.replace(/\s*\(?\d+KG\)?/gi, '').trim();

                    if (cleanItem === cleanStock || (cleanItem.includes(cleanStock) && cleanStock.length > 5)) {
                        if (stockFlavor) {
                            isMatch = itemFullIdent.includes(stockFlavor);
                        } else {
                            isMatch = !itemFlavor;
                        }
                    }
                }
            } else {
                // CASO REGULAR: BOX PERRO, BOX GATO, etc.
                const itemOptions = (item.options || []).map((opt: any) => (opt.name || '').toUpperCase().trim());
                const itemMainOption = itemOptions[0] || '';

                const itemFullIdent = `${itemProductBase} ${itemOptions.join(' ')}`.toUpperCase();
                const weightRegex = /(\d+\s*KG)/gi;
                const itemWeightsMatch = itemFullIdent.match(weightRegex);
                const stockWeightsMatch = `${productName} ${productWeight || ''}`.toUpperCase().match(weightRegex);

                const normalizedItemWeight = itemWeightsMatch ? itemWeightsMatch[0].replace(/\s+/g, '') : null;
                const normalizedStockWeight = stockWeightsMatch ? stockWeightsMatch[0].replace(/\s+/g, '') : (productWeight ? productWeight.replace(/\s+/g, '') : null);

                const itemProduct = `${itemProductBase} ${itemMainOption}`.trim();
                const cleanItemProduct = itemProduct.replace(/\s*\(?\d+\s*KG\)?/gi, '').trim();
                const cleanProductName = productName.replace(/\s*\(?\d+\s*KG\)?/gi, '').trim();

                let extracted = itemProductBase;
                extracted = extracted.replace(/^BOX\s+PERRO\s+/i, '');
                extracted = extracted.replace(/^BOX\s+GATO\s+/i, '');
                extracted = extracted.replace(/\s*\(?\d+\s*KG\)?/gi, '');
                const extractedFlavor = extracted.trim();

                const nameMatch = cleanItemProduct === cleanProductName ||
                    cleanItemProduct.includes(cleanProductName) ||
                    cleanProductName.includes(cleanItemProduct) ||
                    itemProductBase.includes(cleanProductName) ||
                    extractedFlavor === cleanProductName ||
                    cleanProductName === extractedFlavor;

                const strictFlavorMatch = !normalizedStockWeight || extractedFlavor === cleanProductName;

                if (nameMatch && strictFlavorMatch) {
                    if (normalizedStockWeight || normalizedItemWeight) {
                        isMatch = normalizedStockWeight === normalizedItemWeight;
                    } else {
                        isMatch = true;
                    }
                }

                if (!isMatch && extractedFlavor) {
                    const flavorMatch = extractedFlavor === cleanProductName;
                    if (flavorMatch && (!normalizedStockWeight || flavorMatch)) {
                        if (normalizedStockWeight || normalizedItemWeight) {
                            isMatch = normalizedStockWeight === normalizedItemWeight;
                        } else {
                            isMatch = true;
                        }
                    }
                }

                if (!isMatch) {
                    let extractedAlt = itemProduct;
                    extractedAlt = extractedAlt.replace(/^(BARF\s*\/\s*|MEDALLONES\s*\/\s*)/i, '');
                    extractedAlt = extractedAlt.replace(/^BOX\s+PERRO\s+/i, '');
                    extractedAlt = extractedAlt.replace(/^BOX\s+GATO\s+/i, '');
                    extractedAlt = extractedAlt.replace(/\s*\(?\d+\s*KG\)?/gi, '');
                    extractedAlt = extractedAlt.trim();

                    const fallbackNameMatch = extractedAlt === cleanProductName || cleanItemProduct.includes(extractedAlt) || cleanProductName.includes(extractedAlt);
                    if (fallbackNameMatch && (!normalizedStockWeight || extractedAlt === cleanProductName)) {
                        if (normalizedStockWeight || normalizedItemWeight) {
                            isMatch = normalizedStockWeight === normalizedItemWeight;
                        } else {
                            isMatch = true;
                        }
                    }
                }
            }
            if (isMatch) {
                const quantity = item.quantity || item.options?.[0]?.quantity || 1;
                totalQuantity += quantity;
            }
        });
    });
    return totalQuantity;
}
