import { Section, PriceType } from '../../../schemas/prices.schema';

export interface PriceHistoryQuery {
    section?: Section;
    product?: string;
    weight?: string;
    priceType?: PriceType;
    isActive?: boolean;
    month?: number;
    year?: number;
    effectiveDate?: string;
}

export interface PriceHistory {
    product: string;
    section: Section;
    weight?: string;
    priceType: PriceType;
    history: Array<{
        price: number;
        effectiveDate: string;
        month: number;
        year: number;
        createdAt: string;
    }>;
}

export interface PriceStats {
    totalPrices: number;
    pricesBySection: Record<string, number>;
    pricesByType: Record<string, number>;
    averagePriceBySection: Record<string, number>;
    priceChangesThisMonth: number;
    mostRecentChanges: any[];
}
