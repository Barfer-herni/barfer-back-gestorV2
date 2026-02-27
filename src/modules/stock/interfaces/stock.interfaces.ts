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
