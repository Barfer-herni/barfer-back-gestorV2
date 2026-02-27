import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Stock } from '../../schemas/stock.schema';
import { PuntoEnvio } from '../../schemas/punto-envio.schema';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { StockData } from './interfaces/stock.interfaces';

@Injectable()
export class StockService {
    constructor(
        @InjectModel(Stock.name) private readonly stockModel: Model<Stock>,
        @InjectModel(PuntoEnvio.name) private readonly puntoEnvioModel: Model<PuntoEnvio>,
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
            createdAt: doc.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: doc.updatedAt?.toISOString() || new Date().toISOString(),
        };
    }

    private buildLookupPipeline(): any[] {
        return [
            {
                $lookup: {
                    from: 'puntoenvios',
                    localField: 'puntoEnvioId',
                    foreignField: '_id',
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
            if (!Types.ObjectId.isValid(puntoEnvioId)) {
                return { success: false, stock: [], total: 0, error: 'INVALID_PUNTO_ENVIO_ID' };
            }

            const pipeline = [
                { $match: { puntoEnvioId: new Types.ObjectId(puntoEnvioId) } },
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
}
