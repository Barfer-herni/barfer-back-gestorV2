import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PipelineStage } from 'mongoose';
import { Stock } from '../../schemas/stock.schema';
import { PuntoEnvio } from '../../schemas/punto-envio.schema';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockData } from './interfaces/stock.interfaces';
import { Prices } from '../../schemas/prices.schema';
import { ProductForStock, PriceSection } from './interfaces/stock.interfaces';
import { OrdersService } from '../orders/orders.service';
import { calculateSalesFromOrders } from './helpers/calculate-sales.helper';
import * as moment from 'moment';


@Injectable()
export class StockService {
    constructor(
        @InjectModel(Stock.name) private readonly stockModel: Model<Stock>,
        @InjectModel(PuntoEnvio.name) private readonly puntoEnvioModel: Model<PuntoEnvio>,
        @InjectModel(Prices.name) private readonly pricesModel: Model<Prices>,
        private readonly ordersService: OrdersService,
    ) { }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private formatStock(doc: any): StockData {
        return {
            _id: doc._id.toString(),
            puntoEnvio: doc.puntoEnvioNombre || doc.puntoEnvioId?.toString() || '',
            producto: doc.producto,
            peso: doc.peso,
            stockInicial: doc.stockInicial,
            llevamos: doc.llevamos,
            pedidosDelDia: doc.pedidosDelDia,
            stockFinal: doc.stockFinal,
            fecha: doc.fecha
                ? (doc.fecha instanceof Date ? doc.fecha.toISOString().split('T')[0] : doc.fecha)
                : new Date().toISOString().split('T')[0],
            createdAt: doc.createdAt
                ? (doc.createdAt instanceof Date
                    ? doc.createdAt.toISOString()
                    : new Date(doc.createdAt).toISOString())
                : new Date().toISOString(),

            updatedAt: doc.updatedAt
                ? (doc.updatedAt instanceof Date
                    ? doc.updatedAt.toISOString()
                    : new Date(doc.updatedAt).toISOString())
                : new Date().toISOString(),
        };
    }

    private buildLookupPipeline(): any[] {
        return [
            {
                $lookup: {
                    from: 'puntos_envio',
                    localField: 'puntoEnvio',
                    foreignField: 'nombre',
                    as: 'puntoEnvioInfo',
                },
            },
            {
                $addFields: {
                    puntoEnvioNombre: { $arrayElemAt: ['$puntoEnvioInfo.nombre', 0] },
                },
            },
        ];
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

    /**
     * Obtener todo el stock de un punto de envío por su ID.
     */
    async getStockByPuntoEnvio(puntoEnvioId: string): Promise<{
        success: boolean;
        stock?: StockData[];
        total?: number;
        message?: string;
        error?: string;
    }> {
        try {
            if (!puntoEnvioId) return { success: false, stock: [], total: 0, error: 'INVALID_PUNTO_ENVIO_ID' };
            const pipeline = [
                { $match: { puntoEnvio: puntoEnvioId } },
                ...this.buildLookupPipeline(),
                { $sort: { fecha: -1, createdAt: -1 } },
            ];
            const docs = await this.stockModel.aggregate(pipeline).exec();
            const formatted = docs.map(d => this.formatStock(d));
            return { success: true, stock: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in getStockByPuntoEnvio:', error);
            return { success: false, stock: [], total: 0, error: 'GET_STOCK_BY_PUNTO_ENVIO_ERROR' };
        }
    }

    /**
     * Obtener un registro de stock por su ID.
     */
    async getStockById(id: string): Promise<{
        success: boolean;
        stock?: StockData;
        message?: string;
        error?: string;
    }> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                return { success: false, message: 'ID inválido', error: 'INVALID_ID' };
            }

            const pipeline = [
                { $match: { _id: new Types.ObjectId(id) } },
                ...this.buildLookupPipeline(),
            ];

            const result = await this.stockModel.aggregate(pipeline).exec();

            if (result.length === 0) {
                return { success: false, message: 'Stock no encontrado', error: 'STOCK_NOT_FOUND' };
            }

            return { success: true, stock: this.formatStock(result[0]) };
        } catch (error) {
            console.error('Error in getStockById:', error);
            return { success: false, message: 'Error al obtener el stock', error: 'GET_STOCK_BY_ID_ERROR' };
        }
    }

    /**
     * Crear un nuevo registro de stock.
     * Busca el punto de envío por nombre para obtener su ObjectId.
     */
    async createStock(data: CreateStockDto): Promise<{
        success: boolean;
        stock?: StockData;
        message?: string;
        error?: string;
    }> {
        try {
            const puntoEnvio = await this.puntoEnvioModel.findOne({ nombre: data.puntoEnvio }).exec();

            if (!puntoEnvio) {
                return {
                    success: false,
                    message: 'Punto de envío no encontrado',
                    error: 'PUNTO_ENVIO_NOT_FOUND',
                };
            }

            const stockFinal = data.stockFinal ?? (data.stockInicial - data.llevamos);

            const newStock = new this.stockModel({
                puntoEnvioId: puntoEnvio._id,
                producto: data.producto,
                peso: data.peso,
                stockInicial: data.stockInicial,
                llevamos: data.llevamos,
                pedidosDelDia: data.pedidosDelDia,
                stockFinal,
                fecha: data.fecha ? new Date(data.fecha) : new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const saved = await newStock.save();

            const result = await this.getStockById(saved._id.toString());
            return {
                success: true,
                stock: result.stock,
                message: 'Stock creado exitosamente',
            };
        } catch (error) {
            console.error('Error in createStock:', error);
            return { success: false, message: 'Error al crear el stock', error: 'CREATE_STOCK_ERROR' };
        }
    }

    /**
     * Actualizar parcialmente un registro de stock.
     * Recalcula stockFinal si cambia stockInicial o llevamos.
     */
    async updateStock(id: string, data: UpdateStockDto): Promise<{
        success: boolean;
        stock?: StockData;
        message?: string;
        error?: string;
    }> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                return { success: false, message: 'ID inválido', error: 'INVALID_ID' };
            }

            const existing = await this.stockModel.findById(new Types.ObjectId(id)).exec();

            if (!existing) {
                return { success: false, message: 'Stock no encontrado', error: 'STOCK_NOT_FOUND' };
            }

            const updateDoc: any = { updatedAt: new Date() };

            // Si se cambia el punto de envío, resolver por nombre
            if (data.puntoEnvio !== undefined) {
                const puntoEnvio = await this.puntoEnvioModel.findOne({ nombre: data.puntoEnvio }).exec();
                if (puntoEnvio) {
                    updateDoc.puntoEnvioId = puntoEnvio._id;
                }
            }

            if (data.producto !== undefined) updateDoc.producto = data.producto;
            if (data.peso !== undefined) updateDoc.peso = data.peso;
            if (data.stockInicial !== undefined) updateDoc.stockInicial = data.stockInicial;
            if (data.llevamos !== undefined) updateDoc.llevamos = data.llevamos;
            if (data.pedidosDelDia !== undefined) updateDoc.pedidosDelDia = data.pedidosDelDia;
            if (data.fecha !== undefined) updateDoc.fecha = new Date(data.fecha);

            // Recalcular stockFinal si cambió stockInicial o llevamos
            if (data.stockInicial !== undefined || data.llevamos !== undefined) {
                const stockInicial = data.stockInicial ?? existing.stockInicial;
                const llevamos = data.llevamos ?? existing.llevamos;
                updateDoc.stockFinal = stockInicial - llevamos;
            } else if (data.stockFinal !== undefined) {
                updateDoc.stockFinal = data.stockFinal;
            }

            await this.stockModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateDoc }).exec();

            const updated = await this.getStockById(id);
            return { success: true, stock: updated.stock, message: 'Stock actualizado exitosamente' };
        } catch (error) {
            console.error('Error in updateStock:', error);
            return { success: false, message: 'Error al actualizar el stock', error: 'UPDATE_STOCK_ERROR' };
        }
    }

    /**
     * Eliminar un registro de stock por su ID.
     */
    async deleteStock(id: string): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }> {
        try {
            if (!Types.ObjectId.isValid(id)) {
                return { success: false, message: 'ID inválido', error: 'INVALID_ID' };
            }

            const result = await this.stockModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();

            if (result.deletedCount === 0) {
                return { success: false, message: 'Stock no encontrado', error: 'STOCK_NOT_FOUND' };
            }

            return { success: true, message: 'Stock eliminado exitosamente' };
        } catch (error) {
            console.error('Error in deleteStock:', error);
            return { success: false, message: 'Error al eliminar el stock', error: 'DELETE_STOCK_ERROR' };
        }
    }



    async getProductsForStock(): Promise<{
        success: boolean;
        products?: ProductForStock[];
        error?: string;
    }> {
        try {
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

            const excludedOtrosProducts = ['CORNALITOS', 'CALDO DE HUESOS', 'GARRAS', 'HUESO RECREATIVO', 'HUESOS RECREATIVOS'];

            const pipeline: PipelineStage[] = [
                {
                    $match: {
                        isActive: true,
                        effectiveDate: { $lte: todayStr },
                        $or: [
                            { section: 'PERRO' },
                            { section: 'GATO' },
                            { section: 'OTROS' },
                            { product: { $regex: 'VACA', $options: 'i' } },
                        ],
                    },
                },
                { $sort: { effectiveDate: -1, createdAt: -1 } },
                {
                    $addFields: {
                        sectionUpper: { $toUpper: '$section' },
                        productUpper: { $toUpper: '$product' },
                        weightUpper: {
                            $cond: [{ $eq: ['$weight', null] }, null, { $toUpper: '$weight' }],
                        },
                    },
                },
                {
                    $group: {
                        _id: {
                            section: '$sectionUpper',
                            product: '$productUpper',
                            weight: '$weightUpper',
                        },
                        latestPrice: { $first: '$$ROOT' },
                    },
                },
                { $replaceRoot: { newRoot: '$latestPrice' } },
                {
                    $project: {
                        section: { $toUpper: '$section' },
                        product: { $toUpper: '$product' },
                        weight: {
                            $cond: [{ $eq: ['$weight', null] }, null, { $toUpper: '$weight' }],
                        },
                    },
                },
                { $sort: { section: 1, product: 1, weight: 1 } },
            ];

            const products = await this.pricesModel.aggregate(pipeline).exec();

            const filteredProducts = products.filter(p => {
                if (p.section === 'OTROS') {
                    const productUpper = (p.product || '').toUpperCase();
                    return !excludedOtrosProducts.some(excluded =>
                        productUpper.includes(excluded.toUpperCase()),
                    );
                }
                return true;
            });

            const productsWithDetails: ProductForStock[] = filteredProducts.map(p => {
                const parts = [p.section, p.product];
                if (p.weight) parts.push(p.weight);
                return {
                    section: p.section as PriceSection,
                    product: p.product,
                    weight: p.weight,
                    formattedName: parts.join(' - '),
                };
            });

            const uniqueProducts = productsWithDetails.filter((product, index, self) =>
                index === self.findIndex(p =>
                    p.section === product.section &&
                    p.product === product.product &&
                    p.weight === product.weight,
                ),
            );

            return { success: true, products: uniqueProducts };
        } catch (error) {
            console.error('Error in getProductsForStock:', error);
            return { success: false, products: [], error: 'GET_PRODUCTS_FOR_STOCK_ERROR' };
        }
    }


    async initializeStockForDate(puntoEnvio: string, date: Date | string): Promise<{
        success: boolean;
        initialized: boolean;
        count: number;
        message?: string;
        error?: string;
    }> {
        try {
            let targetDateStr: string;
            if (date instanceof Date) {
                targetDateStr = moment(date).format('YYYY-MM-DD');
            } else {
                targetDateStr = (date as string).substring(0, 10);
            }

            const puntoEnvioDoc = await this.puntoEnvioModel.findOne({ nombre: puntoEnvio }).exec();
            if (!puntoEnvioDoc) {
                return {
                    success: false,
                    initialized: false,
                    count: 0,
                    error: 'Punto de envío no encontrado'
                };
            }
            const existingStock = await this.stockModel.find({
                puntoEnvio: puntoEnvio,
                fecha: targetDateStr
            }).exec();
            const recentStock = await this.stockModel
                .find({
                    puntoEnvio: puntoEnvio,
                    fecha: { $lt: targetDateStr }
                })
                .sort({ fecha: -1 })
                .limit(1)
                .exec();

            if (recentStock.length === 0) {
                return {
                    success: true,
                    initialized: false,
                    count: existingStock.length,
                    message: 'No previous stock found to carry over'
                };
            }
            const lastDateStr = recentStock[0].fecha;
            const previousStockRecords = await this.stockModel
                .find({
                    puntoEnvio: puntoEnvio,
                    fecha: lastDateStr
                })
                .exec();

            const ordersForLastDate = await this.ordersService.getExpressOrders(puntoEnvio, lastDateStr, lastDateStr);
            const ordersForTargetDate = await this.ordersService.getExpressOrders(puntoEnvio, targetDateStr, targetDateStr);

            let updatedCount = 0;
            for (const prev of previousStockRecords) {
                let section = (prev as any).section;
                if (!section) {
                    const productUpper = (prev.producto || '').toUpperCase();
                    if (productUpper.includes('GATO')) section = 'GATO';
                    else if (productUpper.includes('PERRO') || productUpper.includes('BIG DOG')) section = 'PERRO';
                    else if (productUpper.includes('OTROS')) section = 'OTROS';
                    else section = 'PERRO';
                }

                const stockInicialValue = prev.stockFinal;
                const pedidosDelDiaForTarget = calculateSalesFromOrders({
                    product: prev.producto,
                    section: section,
                    weight: prev.peso
                }, ordersForTargetDate);

                const existingMatch = existingStock.find(s =>
                    s.producto === prev.producto &&
                    s.peso === prev.peso
                );

                if (existingMatch) {
                    const recalculatedStockFinal = stockInicialValue + (existingMatch.llevamos || 0) - pedidosDelDiaForTarget;
                    await this.stockModel.updateOne(
                        { _id: existingMatch._id },
                        {
                            $set: {
                                stockInicial: stockInicialValue,
                                pedidosDelDia: pedidosDelDiaForTarget,
                                stockFinal: recalculatedStockFinal,
                                section: section,
                                updatedAt: new Date()
                            }
                        }
                    );
                    updatedCount++;
                } else {
                    const newStockFinal = stockInicialValue - pedidosDelDiaForTarget;
                    const newRecord = new this.stockModel({
                        puntoEnvio: puntoEnvio,
                        section: section,
                        producto: prev.producto,
                        peso: prev.peso,
                        stockInicial: stockInicialValue,
                        llevamos: 0,
                        pedidosDelDia: pedidosDelDiaForTarget,
                        stockFinal: newStockFinal,
                        fecha: targetDateStr,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                    await newRecord.save();
                    updatedCount++;
                }
            }
            return {
                success: true,
                initialized: true,
                count: updatedCount,
                message: `Synchronized ${updatedCount} records from ${lastDateStr}`
            };
        } catch (error) {
            console.error('Error in initializeStockForDate:', error);
            return {
                success: false,
                initialized: false,
                count: 0,
                error: 'Failed to initialize stock'
            };
        }
    }

    /**
     * Recalcula recursivamente la cadena de stock hacia adelante
     * asegurando que el stockInicial de hoy sea el stockFinal de ayer.
     */
    async recalculateStockChain(puntoEnvio: string, startDateStr: string): Promise<{
        success: boolean;
        modifiedDays: number;
        message?: string;
    }> {
        try {
            const subsequentDates = await this.stockModel.distinct('fecha', {
                puntoEnvio: puntoEnvio,
                fecha: { $gte: startDateStr }
            });
            subsequentDates.sort();

            let modifiedDays = 0;

            for (let i = 0; i < subsequentDates.length; i++) {
                const currentDate = subsequentDates[i];
                if (i === 0) continue;
                const previousDate = subsequentDates[i - 1];
                const prevRecords = await this.stockModel.find({ puntoEnvio, fecha: previousDate }).exec();
                const currRecords = await this.stockModel.find({ puntoEnvio, fecha: currentDate }).exec();

                for (const curr of currRecords) {
                    const prevMatch = prevRecords.find(p => p.producto === curr.producto && p.peso === curr.peso);

                    if (prevMatch) {
                        const correctStockInicial = prevMatch.stockFinal;

                        if (curr.stockInicial !== correctStockInicial) {
                            const newStockFinal = correctStockInicial + (curr.llevamos || 0) - (curr.pedidosDelDia || 0);

                            await this.stockModel.updateOne(
                                { _id: curr._id },
                                {
                                    $set: {
                                        stockInicial: correctStockInicial,
                                        stockFinal: newStockFinal,
                                        updatedAt: new Date()
                                    }
                                }
                            );
                        }
                    }
                }
                modifiedDays++;
            }
            return { success: true, modifiedDays, message: `Se procesaron ${modifiedDays} días` };
        } catch (error) {
            console.error('Error in recalculateStockChain:', error);
            return { success: false, modifiedDays: 0, message: error.message };
        }
    }
}
