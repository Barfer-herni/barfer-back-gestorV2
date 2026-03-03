export interface StockData {
    _id: string;
    puntoEnvio: string;
    producto: string;
    peso?: string;
    stockInicial: number;
    llevamos: number;
    pedidosDelDia: number;
    stockFinal: number;
    fecha: string;
    createdAt: string;
    updatedAt: string;
}

export type PriceSection = 'PERRO' | 'GATO' | 'OTROS' | 'RAW';
export interface ProductForStock {
    section: PriceSection;
    product: string;
    weight: string | null;
    formattedName: string; // "section - product - weight" o "section - product"
}
