import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Salidas } from '../../schemas/salidas.schema';
import { Proveedores } from '../../schemas/proveedores.schema';
import { CategoriaGestor } from '../../schemas/categorias-gestor.schema';
import { PaymentsGestor } from '../../schemas/payments-gestor.schema';
import { CreateSalidaDto } from './dto/create-salida.dto';
import { UpdateSalidaDto } from './dto/update-salida.dto';
import { SalidaData, SalidasFilters } from './interfaces/salidas.interfaces';

@Injectable()
export class SalidasService {
    constructor(
        @InjectModel(Salidas.name) private readonly salidasModel: Model<Salidas>,
        @InjectModel(CategoriaGestor.name) private readonly categoriasModel: Model<CategoriaGestor>,
        @InjectModel(PaymentsGestor.name) private readonly metodosPagoModel: Model<PaymentsGestor>,
        @InjectModel(Proveedores.name) private readonly proveedoresModel: Model<Proveedores>,
    ) { }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Construye el pipeline base de agregación de MongoDB.
     * Hace $lookup a categorías, métodos de pago y proveedores,
     * y aplana los arrays resultantes con $addFields.
     * Se reutiliza en getAllSalidas y getSalidaById.
     */
    private buildBasePipeline(): any[] {
        return [
            {
                $addFields: {
                    categoriaIdObj: { $convert: { input: '$categoriaId', to: 'objectId', onError: null, onNull: null } },
                    metodoPagoIdObj: { $convert: { input: '$metodoPagoId', to: 'objectId', onError: null, onNull: null } },
                    proveedorIdObj: { $convert: { input: '$proveedorId', to: 'objectId', onError: null, onNull: null } },
                }
            },
            {
                $lookup: {
                    from: 'categorias',
                    localField: 'categoriaIdObj',
                    foreignField: '_id',
                    as: 'categoria',
                },
            },
            {
                $lookup: {
                    from: 'metodos_pago',
                    localField: 'metodoPagoIdObj',
                    foreignField: '_id',
                    as: 'metodoPago',
                },
            },
            {
                $lookup: {
                    from: 'proveedores',
                    localField: 'proveedorIdObj',
                    foreignField: '_id',
                    as: 'proveedor',
                },
            },
            {
                $addFields: {
                    categoria: { $arrayElemAt: ['$categoria', 0] },
                    metodoPago: { $arrayElemAt: ['$metodoPago', 0] },
                    proveedor: { $arrayElemAt: ['$proveedor', 0] },
                },
            },
        ];
    }

    /**
     * Convierte un documento raw de MongoDB (resultado de aggregate)
     * al formato tipado SalidaData, convirtiendo ObjectIds a strings
     * y resolviendo los datos relacionados (categoria, metodoPago, proveedor).
     */
    private formatSalida(salida: any): SalidaData {
        return {
            _id: salida._id.toString(),
            fechaFactura: salida.fechaFactura,
            detalle: salida.detalle,
            tipo: salida.tipo,
            marca: salida.marca ?? null,
            monto: salida.monto,
            tipoRegistro: salida.tipoRegistro,
            categoriaId: salida.categoriaId?.toString(),
            metodoPagoId: salida.metodoPagoId?.toString(),
            proveedorId: salida.proveedorId ? salida.proveedorId.toString() : null,
            fechaPago: salida.fechaPago ?? null,
            comprobanteNumber: salida.comprobanteNumber ?? null,
            categoria: salida.categoria
                ? { _id: salida.categoria._id.toString(), nombre: salida.categoria.nombre ?? salida.categoria.name }
                : undefined,
            metodoPago: salida.metodoPago
                ? { _id: salida.metodoPago._id.toString(), nombre: salida.metodoPago.nombre }
                : undefined,
            proveedor: salida.proveedor
                ? {
                    _id: salida.proveedor._id.toString(),
                    nombre: salida.proveedor.nombre,
                    detalle: salida.proveedor.detalle,
                    telefono: salida.proveedor.telefono,
                    personaContacto: salida.proveedor.personaContacto,
                    registro: salida.proveedor.registro,
                }
                : null,
            createdAt: salida.createdAt,
            updatedAt: salida.updatedAt ?? salida.updateAt,
        };
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

    /**
     * Obtiene todas las salidas de la base de datos, ordenadas por fechaFactura
     * de más reciente a más antigua, con sus datos relacionados populados
     * (categoria, metodoPago, proveedor).
     */
    async getAllSalidas(): Promise<{ success: boolean; salidas?: SalidaData[]; total?: number; message?: string; error?: string }> {
        try {
            const pipeline = [...this.buildBasePipeline(), { $sort: { fechaFactura: -1 } }];
            const salidas = await this.salidasModel.aggregate(pipeline).exec();
            const formatted = salidas.map(s => this.formatSalida(s));
            return { success: true, salidas: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in getAllSalidas:', error);
            return { success: false, message: 'Error al obtener las salidas', error: 'GET_ALL_SALIDAS_ERROR' };
        }
    }

    /**
     * Busca una salida por su ID de MongoDB.
     * Retorna la salida con sus datos relacionados populados.
     * Si no existe, retorna error 'SALIDA_NOT_FOUND'.
     */
    async getSalidaById(id: string): Promise<{ success: boolean; salida?: SalidaData; message?: string; error?: string }> {
        try {
            const pipeline = [{ $match: { _id: new Types.ObjectId(id) } }, ...this.buildBasePipeline()];
            const result = await this.salidasModel.aggregate(pipeline).exec();

            if (result.length === 0) {
                return { success: false, message: 'Salida no encontrada', error: 'SALIDA_NOT_FOUND' };
            }

            return { success: true, salida: this.formatSalida(result[0]) };
        } catch (error) {
            console.error('Error in getSalidaById:', error);
            return { success: false, message: 'Error al obtener la salida', error: 'GET_SALIDA_BY_ID_ERROR' };
        }
    }

    /**
     * Crea una nueva salida en la base de datos.
     * Convierte los IDs de categoría, metodoPago y proveedor a ObjectId.
     * Retorna la salida recién creada con sus datos relacionados populados.
     */
    async createSalida(data: CreateSalidaDto): Promise<{ success: boolean; salida?: SalidaData; message?: string; error?: string }> {
        try {
            const doc: any = {
                fechaFactura: data.fechaFactura,
                detalle: data.detalle,
                categoriaId: new Types.ObjectId(data.categoriaId),
                tipo: data.tipo,
                monto: data.monto,
                metodoPagoId: new Types.ObjectId(data.metodoPagoId),
                tipoRegistro: data.tipoRegistro,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            if (data.marca !== undefined) doc.marca = data.marca;
            if (data.proveedorId !== undefined) doc.proveedorId = new Types.ObjectId(data.proveedorId);
            if (data.fechaPago !== undefined) doc.fechaPago = data.fechaPago;
            if (data.comprobanteNumber !== undefined) doc.comprobanteNumber = data.comprobanteNumber;

            const newSalida = new this.salidasModel(doc);
            const saved = await newSalida.save();

            return this.getSalidaById(saved._id.toString()).then(r => ({
                success: true,
                salida: r.salida,
                message: 'Salida creada exitosamente',
            }));
        } catch (error) {
            console.error('Error in createSalida:', error);
            return { success: false, message: 'Error al crear la salida', error: 'CREATE_SALIDA_ERROR' };
        }
    }

    /**
     * Actualiza parcialmente una salida existente.
     * Solo sobreescribe los campos que vienen en el DTO (patch parcial).
     * Retorna la salida actualizada con sus datos relacionados populados.
     * Si no existe, retorna error 'SALIDA_NOT_FOUND'.
     */
    async updateSalida(id: string, data: UpdateSalidaDto): Promise<{ success: boolean; salida?: SalidaData; message?: string; error?: string }> {
        try {
            const updateData: any = { updatedAt: new Date() };

            if (data.fechaFactura !== undefined) updateData.fechaFactura = data.fechaFactura;
            if (data.detalle !== undefined) updateData.detalle = data.detalle;
            if (data.categoriaId !== undefined) updateData.categoriaId = new Types.ObjectId(data.categoriaId);
            if (data.tipo !== undefined) updateData.tipo = data.tipo;
            if (data.marca !== undefined) updateData.marca = data.marca;
            if (data.monto !== undefined) updateData.monto = data.monto;
            if (data.metodoPagoId !== undefined) updateData.metodoPagoId = new Types.ObjectId(data.metodoPagoId);
            if (data.tipoRegistro !== undefined) updateData.tipoRegistro = data.tipoRegistro;
            if (data.proveedorId !== undefined) updateData.proveedorId = data.proveedorId ? new Types.ObjectId(data.proveedorId) : null;
            if (data.fechaPago !== undefined) updateData.fechaPago = data.fechaPago;
            if (data.comprobanteNumber !== undefined) updateData.comprobanteNumber = data.comprobanteNumber;

            const result = await this.salidasModel.updateOne({ _id: new Types.ObjectId(id) }, { $set: updateData }).exec();

            if (result.matchedCount === 0) {
                return { success: false, message: 'Salida no encontrada', error: 'SALIDA_NOT_FOUND' };
            }

            const updated = await this.getSalidaById(id);
            return { success: true, salida: updated.salida, message: 'Salida actualizada exitosamente' };
        } catch (error) {
            console.error('Error in updateSalida:', error);
            return { success: false, message: 'Error al actualizar la salida', error: 'UPDATE_SALIDA_ERROR' };
        }
    }

    /**
     * Elimina una salida de la base de datos por su ID.
     * Si no existe, retorna error 'SALIDA_NOT_FOUND'.
     */
    async deleteSalida(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const result = await this.salidasModel.deleteOne({ _id: new Types.ObjectId(id) }).exec();

            if (result.deletedCount === 0) {
                return { success: false, message: 'Salida no encontrada', error: 'SALIDA_NOT_FOUND' };
            }

            return { success: true, message: 'Salida eliminada exitosamente' };
        } catch (error) {
            console.error('Error in deleteSalida:', error);
            return { success: false, message: 'Error al eliminar la salida', error: 'DELETE_SALIDA_ERROR' };
        }
    }

    // ── Paginación con filtros ─────────────────────────────────────────────────

    /**
     * Obtiene salidas de forma paginada con filtros opcionales.
     * Soporta filtrar por: categoría, marca, tipo (ORDINARIO/EXTRAORDINARIO),
     * tipoRegistro (BLANCO/NEGRO), método de pago, rango de fechas y búsqueda
     * de texto libre (busca en detalle, categoría, proveedor, marca, monto).
     * Primero cuenta el total para calcular pageCount, luego aplica $skip/$limit.
     * @param pageIndex - Página actual (base 0).
     * @param pageSize  - Cantidad de resultados por página.
     * @param filters   - Objeto con los filtros a aplicar.
     */
    async getSalidasPaginated({
        pageIndex = 0,
        pageSize = 50,
        filters = {},
    }: {
        pageIndex?: number;
        pageSize?: number;
        filters?: SalidasFilters;
    }): Promise<{ success: boolean; salidas?: SalidaData[]; total?: number; pageCount?: number; message?: string; error?: string }> {
        try {
            const pipeline: any[] = [
                {
                    $addFields: {
                        categoriaIdObj: { $convert: { input: '$categoriaId', to: 'objectId', onError: null, onNull: null } },
                        metodoPagoIdObj: { $convert: { input: '$metodoPagoId', to: 'objectId', onError: null, onNull: null } },
                        proveedorIdObj: { $convert: { input: '$proveedorId', to: 'objectId', onError: null, onNull: null } },
                    }
                },
                // Lookup categoría primero para filtrar por permisos o selección
                {
                    $lookup: {
                        from: 'categorias',
                        localField: 'categoriaIdObj',
                        foreignField: '_id',
                        as: 'categoria',
                    },
                },
                {
                    $addFields: {
                        categoria: { $arrayElemAt: ['$categoria', 0] },
                    },
                },
            ];

            const matchConditions: any = {};

            // Filtro por categoríaId específica
            if (filters.categoriaId) {
                const categoria = await this.categoriasModel.findById(filters.categoriaId).exec();
                if (categoria) {
                    matchConditions['categoria.nombre'] = (categoria as any).nombre;
                } else {
                    return { success: true, salidas: [], total: 0, pageCount: 0 };
                }
            }

            if (filters.marca) matchConditions['marca'] = filters.marca;
            if (filters.tipo) matchConditions['tipo'] = filters.tipo;
            if (filters.tipoRegistro) matchConditions['tipoRegistro'] = filters.tipoRegistro;

            // Filtro de fecha
            if (filters.fechaDesde || filters.fechaHasta) {
                const facturaCondition: any = {};
                const pagoCondition: any = {};
                if (filters.fechaDesde) { facturaCondition.$gte = filters.fechaDesde; pagoCondition.$gte = filters.fechaDesde; }
                if (filters.fechaHasta) { facturaCondition.$lte = filters.fechaHasta; pagoCondition.$lte = filters.fechaHasta; }
                matchConditions.$or = [{ fechaFactura: facturaCondition }, { fechaPago: pagoCondition }];
            } else if (filters.fecha) {
                const dateObj = new Date(filters.fecha);
                const startOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0);
                const endOfDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
                matchConditions.$or = [
                    { fechaFactura: { $gte: startOfDay, $lte: endOfDay } },
                    { fechaPago: { $gte: startOfDay, $lte: endOfDay } },
                ];
            }

            if (Object.keys(matchConditions).length > 0) {
                pipeline.push({ $match: matchConditions });
            }

            // Lookup resto de colecciones
            pipeline.push(
                {
                    $lookup: {
                        from: 'metodos_pago',
                        localField: 'metodoPagoIdObj',
                        foreignField: '_id',
                        as: 'metodoPago',
                    },
                },
                {
                    $lookup: {
                        from: 'proveedores',
                        localField: 'proveedorIdObj',
                        foreignField: '_id',
                        as: 'proveedor',
                    },
                },
                {
                    $addFields: {
                        metodoPago: { $arrayElemAt: ['$metodoPago', 0] },
                        proveedor: { $arrayElemAt: ['$proveedor', 0] },
                    },
                },
            );

            // Filtros post-lookup
            const postLookupConditions: any[] = [];

            if (filters.metodoPagoId) {
                const metodoPago = await this.metodosPagoModel.findById(filters.metodoPagoId).exec();
                if (metodoPago) {
                    postLookupConditions.push({ 'metodoPago.nombre': metodoPago.nombre });
                }
            }

            if (filters.searchTerm && filters.searchTerm.trim() !== '') {
                const searchRegex = { $regex: filters.searchTerm, $options: 'i' };
                postLookupConditions.push({
                    $or: [
                        { detalle: searchRegex },
                        { 'categoria.nombre': searchRegex },
                        { 'categoria.name': searchRegex },
                        { 'proveedor.nombre': searchRegex },
                        { marca: searchRegex },
                        { 'metodoPago.nombre': searchRegex },
                        { monto: isNaN(Number(filters.searchTerm)) ? -1 : Number(filters.searchTerm) },
                    ],
                });
            }

            if (postLookupConditions.length > 0) {
                pipeline.push({
                    $match: postLookupConditions.length === 1 ? postLookupConditions[0] : { $and: postLookupConditions },
                });
            }

            pipeline.push({ $sort: { fechaFactura: -1 } });

            // Contar total antes de paginar
            const countPipeline = [...pipeline, { $count: 'total' }];
            const countResult = await this.salidasModel.aggregate(countPipeline).exec();
            const total = countResult.length > 0 ? countResult[0].total : 0;
            const pageCount = Math.ceil(total / pageSize);

            // Paginación
            pipeline.push({ $skip: pageIndex * pageSize }, { $limit: pageSize });

            const salidas = await this.salidasModel.aggregate(pipeline).exec();
            const formatted = salidas.map(s => this.formatSalida(s));
            return { success: true, salidas: formatted, total, pageCount };
        } catch (error) {
            console.error('Error in getSalidasPaginated:', error);
            return { success: false, message: 'Error al obtener las salidas paginadas', error: 'GET_SALIDAS_PAGINATED_ERROR' };
        }
    }

    // ── Estadísticas ───────────────────────────────────────────────────────────

    /**
     * Calcula estadísticas agregadas de salidas para un mes y año determinados.
     * Retorna totales de cantidad y monto, desglosados por tipo
     * (ORDINARIO/EXTRAORDINARIO) y por tipoRegistro (BLANCO/NEGRO).
     * @param year  - Año (ej: 2025).
     * @param month - Mes (1-12).
     */
    async getSalidasStatsByMonth(year: number, month: number): Promise<{
        success: boolean;
        stats?: {
            totalSalidas: number;
            totalMonto: number;
            salidasOrdinarias: number;
            salidasExtraordinarias: number;
            montoOrdinario: number;
            montoExtraordinario: number;
            salidasBlancas: number;
            salidasNegras: number;
            montoBlanco: number;
            montoNegro: number;
        };
        message?: string;
        error?: string;
    }> {
        try {
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0, 23, 59, 59);

            const salidas = await this.salidasModel.find({
                fechaFactura: { $gte: startDate, $lte: endDate },
            }).exec();

            const stats = {
                totalSalidas: salidas.length,
                totalMonto: salidas.reduce((sum, s) => sum + s.monto, 0),
                salidasOrdinarias: salidas.filter(s => s.tipo === 'ORDINARIO').length,
                salidasExtraordinarias: salidas.filter(s => s.tipo === 'EXTRAORDINARIO').length,
                montoOrdinario: salidas.filter(s => s.tipo === 'ORDINARIO').reduce((sum, s) => sum + s.monto, 0),
                montoExtraordinario: salidas.filter(s => s.tipo === 'EXTRAORDINARIO').reduce((sum, s) => sum + s.monto, 0),
                salidasBlancas: salidas.filter(s => s.tipoRegistro === 'BLANCO').length,
                salidasNegras: salidas.filter(s => s.tipoRegistro === 'NEGRO').length,
                montoBlanco: salidas.filter(s => s.tipoRegistro === 'BLANCO').reduce((sum, s) => sum + s.monto, 0),
                montoNegro: salidas.filter(s => s.tipoRegistro === 'NEGRO').reduce((sum, s) => sum + s.monto, 0),
            };

            return { success: true, stats };
        } catch (error) {
            console.error('Error in getSalidasStatsByMonth:', error);
            return { success: false, message: 'Error al obtener estadísticas de salidas', error: 'GET_SALIDAS_STATS_BY_MONTH_ERROR' };
        }
    }

    /**
     * Obtiene todas las salidas cuya fechaFactura esté dentro de un rango
     * de fechas (startDate inclusive, endDate inclusive).
     * Retorna solo los campos básicos de la salida (sin datos relacionados populados).
     * @param startDate - Fecha de inicio del rango.
     * @param endDate   - Fecha de fin del rango.
     */
    async getSalidasByDateRange(startDate: Date, endDate: Date): Promise<{ success: boolean; salidas?: SalidaData[]; total?: number; message?: string; error?: string }> {
        try {
            const salidas = await this.salidasModel.find({
                fechaFactura: { $gte: startDate, $lte: endDate },
            }).sort({ fechaFactura: -1 }).exec();

            const formatted = salidas.map(s => ({
                _id: s._id.toString(),
                fechaFactura: s.fechaFactura,
                detalle: s.detalle,
                tipo: s.tipo,
                marca: s.marca ?? null,
                monto: s.monto,
                tipoRegistro: s.tipoRegistro,
                categoriaId: s.categoriaId?.toString(),
                metodoPagoId: s.metodoPagoId?.toString(),
                proveedorId: (s as any).proveedorId ? (s as any).proveedorId.toString() : null,
                fechaPago: (s as any).fechaPago ?? null,
                comprobanteNumber: (s as any).comprobanteNumber ?? null,
                createdAt: s.createdAt,
                updatedAt: (s as any).updatedAt ?? (s as any).updateAt,
            })) as SalidaData[];

            return { success: true, salidas: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in getSalidasByDateRange:', error);
            return { success: false, message: 'Error al obtener salidas por rango de fechas', error: 'GET_SALIDAS_BY_DATE_RANGE_ERROR' };
        }
    }
}
