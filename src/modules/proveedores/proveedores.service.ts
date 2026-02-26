import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Proveedores } from '../../schemas/proveedores.schema';
import { CategoriaGestor } from '../../schemas/categorias-gestor.schema';
import { PaymentsGestor } from '../../schemas/payments-gestor.schema';
import { CreateProveedorDto } from './dto/create-proveedor.dto';
import { UpdateProveedorDto } from './dto/update-proveedor.dto';
import { ProveedorData } from './interfaces/proveedores.interfaces';

@Injectable()
export class ProveedoresService {
    constructor(
        @InjectModel(Proveedores.name) private readonly proveedoresModel: Model<Proveedores>,
        @InjectModel(CategoriaGestor.name) private readonly categoriasModel: Model<CategoriaGestor>,
        @InjectModel(PaymentsGestor.name) private readonly metodosPagoModel: Model<PaymentsGestor>,
    ) { }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Construye el pipeline de $lookup para categoría y metodoPago.
     * Reutilizable en getAllProveedores, getProveedorById y searchProveedores.
     */
    private buildLookupPipeline(): any[] {
        return [
            {
                $lookup: {
                    from: 'categoriagstors',
                    localField: 'categoriaId',
                    foreignField: '_id',
                    as: 'categoria',
                },
            },
            {
                $lookup: {
                    from: 'paymentsgestors',
                    localField: 'metodoPagoId',
                    foreignField: '_id',
                    as: 'metodoPago',
                },
            },
            {
                $addFields: {
                    categoria: { $arrayElemAt: ['$categoria', 0] },
                    metodoPago: { $arrayElemAt: ['$metodoPago', 0] },
                },
            },
        ];
    }

    /**
     * Convierte un documento raw de MongoDB al formato tipado ProveedorData,
     * normalizando ObjectIds a strings y resolviendo los datos relacionados.
     */
    private formatProveedor(p: any): ProveedorData {
        return {
            _id: p._id.toString(),
            nombre: p.nombre,
            detalle: p.detalle,
            telefono: p.telefono,
            personaContacto: p.personaContacto,
            registro: p.registro,
            categoriaId: p.categoriaId ? p.categoriaId.toString() : null,
            metodoPagoId: p.metodoPagoId ? p.metodoPagoId.toString() : null,
            categoria: p.categoria
                ? { _id: p.categoria._id.toString(), nombre: p.categoria.nombre ?? p.categoria.name }
                : undefined,
            metodoPago: p.metodoPago
                ? { _id: p.metodoPago._id.toString(), nombre: p.metodoPago.nombre }
                : undefined,
            isActive: p.isActive,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        };
    }

    // ── CRUD ───────────────────────────────────────────────────────────────────

    /**
     * Obtiene todos los proveedores activos (isActive: true),
     * ordenados alfabéticamente por nombre, con categoría y metodoPago populados.
     */
    async getAllProveedores(): Promise<{ success: boolean; proveedores?: ProveedorData[]; total?: number; message?: string; error?: string }> {
        try {
            const pipeline = [
                { $match: { isActive: true } },
                ...this.buildLookupPipeline(),
                { $sort: { nombre: 1 } },
            ];
            const proveedores = await this.proveedoresModel.aggregate(pipeline).exec();
            const formatted = proveedores.map(p => this.formatProveedor(p));
            return { success: true, proveedores: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in getAllProveedores:', error);
            return { success: false, message: 'Error al obtener los proveedores', error: 'GET_ALL_PROVEEDORES_ERROR' };
        }
    }

    /**
     * Obtiene todos los proveedores incluyendo los inactivos (isActive: false),
     * ordenados alfabéticamente por nombre, con datos relacionados populados.
     */
    async getAllProveedoresIncludingInactive(): Promise<{ success: boolean; proveedores?: ProveedorData[]; total?: number; message?: string; error?: string }> {
        try {
            const pipeline = [
                ...this.buildLookupPipeline(),
                { $sort: { nombre: 1 } },
            ];
            const proveedores = await this.proveedoresModel.aggregate(pipeline).exec();
            const formatted = proveedores.map(p => this.formatProveedor(p));
            return { success: true, proveedores: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in getAllProveedoresIncludingInactive:', error);
            return { success: false, message: 'Error al obtener los proveedores', error: 'GET_ALL_PROVEEDORES_INCLUDING_INACTIVE_ERROR' };
        }
    }

    /**
     * Busca un proveedor por su ID de MongoDB con datos relacionados populados.
     * Si no existe, retorna error 'PROVEEDOR_NOT_FOUND'.
     */
    async getProveedorById(id: string): Promise<{ success: boolean; proveedor?: ProveedorData; message?: string; error?: string }> {
        try {
            const pipeline = [
                { $match: { _id: new Types.ObjectId(id) } },
                ...this.buildLookupPipeline(),
            ];
            const result = await this.proveedoresModel.aggregate(pipeline).exec();

            if (result.length === 0) {
                return { success: false, message: 'Proveedor no encontrado', error: 'PROVEEDOR_NOT_FOUND' };
            }

            return { success: true, proveedor: this.formatProveedor(result[0]) };
        } catch (error) {
            console.error('Error in getProveedorById:', error);
            return { success: false, message: 'Error al obtener el proveedor', error: 'GET_PROVEEDOR_BY_ID_ERROR' };
        }
    }

    /**
     * Crea un nuevo proveedor. Verifica que no exista otro con el mismo nombre
     * (case-insensitive). Retorna el proveedor creado con datos relacionados.
     */
    async createProveedor(data: CreateProveedorDto): Promise<{ success: boolean; proveedor?: ProveedorData; message?: string; error?: string }> {
        try {
            // Verificar nombre duplicado
            const existing = await this.proveedoresModel.findOne({
                nombre: { $regex: new RegExp(`^${data.nombre}$`, 'i') },
            }).exec();

            if (existing) {
                return { success: false, message: 'Ya existe un proveedor con ese nombre', error: 'PROVEEDOR_ALREADY_EXISTS' };
            }

            const doc: any = {
                nombre: data.nombre,
                detalle: data.detalle,
                telefono: data.telefono,
                personaContacto: data.personaContacto,
                registro: data.registro,
                isActive: data.isActive !== undefined ? data.isActive : true,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            if (data.categoriaId) doc.categoriaId = new Types.ObjectId(data.categoriaId);
            if (data.metodoPagoId) doc.metodoPagoId = new Types.ObjectId(data.metodoPagoId);

            const saved = await new this.proveedoresModel(doc).save();
            const created = await this.getProveedorById(saved._id.toString());

            return { success: true, proveedor: created.proveedor, message: 'Proveedor creado exitosamente' };
        } catch (error) {
            console.error('Error in createProveedor:', error);
            return { success: false, message: 'Error al crear el proveedor', error: 'CREATE_PROVEEDOR_ERROR' };
        }
    }

    /**
     * Actualiza parcialmente un proveedor existente.
     * Verifica que el nuevo nombre no esté en uso por otro proveedor.
     * Retorna el proveedor actualizado con datos relacionados.
     * Si no existe, retorna error 'PROVEEDOR_NOT_FOUND'.
     */
    async updateProveedor(id: string, data: UpdateProveedorDto): Promise<{ success: boolean; proveedor?: ProveedorData; message?: string; error?: string }> {
        try {
            const existing = await this.proveedoresModel.findById(id).exec();
            if (!existing) {
                return { success: false, message: 'Proveedor no encontrado', error: 'PROVEEDOR_NOT_FOUND' };
            }

            // Verificar nombre duplicado en otro documento
            if (data.nombre && data.nombre !== existing.nombre) {
                const duplicate = await this.proveedoresModel.findOne({
                    nombre: { $regex: new RegExp(`^${data.nombre}$`, 'i') },
                    _id: { $ne: new Types.ObjectId(id) },
                }).exec();

                if (duplicate) {
                    return { success: false, message: 'Ya existe otro proveedor con ese nombre', error: 'PROVEEDOR_NAME_ALREADY_EXISTS' };
                }
            }

            const updateData: any = { updatedAt: new Date() };

            if (data.nombre !== undefined) updateData.nombre = data.nombre;
            if (data.detalle !== undefined) updateData.detalle = data.detalle;
            if (data.telefono !== undefined) updateData.telefono = data.telefono;
            if (data.personaContacto !== undefined) updateData.personaContacto = data.personaContacto;
            if (data.registro !== undefined) updateData.registro = data.registro;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;
            if (data.categoriaId !== undefined) updateData.categoriaId = data.categoriaId ? new Types.ObjectId(data.categoriaId) : null;
            if (data.metodoPagoId !== undefined) updateData.metodoPagoId = data.metodoPagoId ? new Types.ObjectId(data.metodoPagoId) : null;

            const result = await this.proveedoresModel.updateOne(
                { _id: new Types.ObjectId(id) },
                { $set: updateData },
            ).exec();

            if (result.matchedCount === 0) {
                return { success: false, message: 'Proveedor no encontrado', error: 'PROVEEDOR_NOT_FOUND' };
            }

            const updated = await this.getProveedorById(id);
            return { success: true, proveedor: updated.proveedor, message: 'Proveedor actualizado exitosamente' };
        } catch (error) {
            console.error('Error in updateProveedor:', error);
            return { success: false, message: 'Error al actualizar el proveedor', error: 'UPDATE_PROVEEDOR_ERROR' };
        }
    }

    /**
     * Soft-delete: marca el proveedor como inactivo (isActive: false) en lugar
     * de eliminarlo físicamente, para preservar el historial de salidas asociadas.
     * Si no existe, retorna error 'PROVEEDOR_NOT_FOUND'.
     */
    async deleteProveedor(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
        try {
            const result = await this.proveedoresModel.updateOne(
                { _id: new Types.ObjectId(id) },
                { $set: { isActive: false, updatedAt: new Date() } },
            ).exec();

            if (result.matchedCount === 0) {
                return { success: false, message: 'Proveedor no encontrado', error: 'PROVEEDOR_NOT_FOUND' };
            }

            return { success: true, message: 'Proveedor eliminado exitosamente' };
        } catch (error) {
            console.error('Error in deleteProveedor:', error);
            return { success: false, message: 'Error al eliminar el proveedor', error: 'DELETE_PROVEEDOR_ERROR' };
        }
    }

    /**
     * Busca proveedores activos por término de texto (case-insensitive).
     * Busca en los campos: nombre, detalle y personaContacto.
     * Retorna los resultados con categoría y metodoPago populados.
     * @param searchTerm - Texto a buscar.
     */
    async searchProveedores(searchTerm: string): Promise<{ success: boolean; proveedores?: ProveedorData[]; total?: number; message?: string; error?: string }> {
        try {
            const regex = { $regex: searchTerm, $options: 'i' };
            const pipeline = [
                {
                    $match: {
                        isActive: true,
                        $or: [
                            { nombre: regex },
                            { detalle: regex },
                            { personaContacto: regex },
                        ],
                    },
                },
                ...this.buildLookupPipeline(),
                { $sort: { nombre: 1 } },
            ];

            const proveedores = await this.proveedoresModel.aggregate(pipeline).exec();
            const formatted = proveedores.map(p => this.formatProveedor(p));
            return { success: true, proveedores: formatted, total: formatted.length };
        } catch (error) {
            console.error('Error in searchProveedores:', error);
            return { success: false, message: 'Error al buscar proveedores', error: 'SEARCH_PROVEEDORES_ERROR' };
        }
    }
}
