import {
    Injectable,
    NotFoundException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MetodoPago } from '../../schemas/metodos-pago.schema';
import { CreateMetodoPagoDto } from './dto/create-metodo-pago.dto';
import { UpdateMetodoPagoDto } from './dto/update-metodo-pago.dto';

@Injectable()
export class MetodosPagoService {
    constructor(
        @InjectModel(MetodoPago.name)
        private readonly metodoPagoModel: Model<MetodoPago>,
    ) { }

    /**
     * Obtener todos los métodos de pago activos
     */
    async findAllActive() {
        try {
            const metodosPago = await this.metodoPagoModel
                .find({ isActive: true })
                .sort({ nombre: 1 })
                .exec();

            return {
                success: true,
                metodosPago,
                total: metodosPago.length,
            };
        } catch (error) {
            console.error('Error in findAllActive:', error);
            throw new InternalServerErrorException('Error al obtener los métodos de pago');
        }
    }

    /**
     * Obtener todos los métodos de pago (incluyendo inactivos)
     */
    async findAll() {
        try {
            const metodosPago = await this.metodoPagoModel
                .find({})
                .sort({ nombre: 1 })
                .exec();

            return {
                success: true,
                metodosPago,
                total: metodosPago.length,
            };
        } catch (error) {
            console.error('Error in findAll:', error);
            throw new InternalServerErrorException('Error al obtener los métodos de pago');
        }
    }

    /**
     * Obtener un método de pago por ID
     */
    async findOne(id: string) {
        try {
            const metodoPago = await this.metodoPagoModel.findById(id).exec();

            if (!metodoPago) {
                throw new NotFoundException('Método de pago no encontrado');
            }

            return {
                success: true,
                metodoPago,
            };
        } catch (error) {
            console.error('Error in findOne:', error);
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al obtener el método de pago');
        }
    }

    /**
     * Crear un nuevo método de pago
     */
    async create(createMetodoPagoDto: CreateMetodoPagoDto) {
        const normalizedNombre = createMetodoPagoDto.nombre.toUpperCase();

        try {
            const existingMetodoPago = await this.metodoPagoModel.findOne({
                nombre: normalizedNombre,
            }).exec();

            if (existingMetodoPago) {
                throw new ConflictException('Ya existe un método de pago con ese nombre');
            }

            const newMetodoPago = new this.metodoPagoModel({
                nombre: normalizedNombre,
                descripcion: createMetodoPagoDto.descripcion,
                isActive: createMetodoPagoDto.isActive ?? true,
            });

            const savedMetodoPago = await newMetodoPago.save();

            return {
                success: true,
                metodoPago: savedMetodoPago,
                message: 'Método de pago creado exitosamente',
            };
        } catch (error: any) {
            console.error('Error in create:', error);
            if (error.code === 11000) {
                throw new ConflictException('Ya existe un método de pago con ese nombre');
            }
            if (error instanceof ConflictException) throw error;
            throw new InternalServerErrorException('Error al crear el método de pago');
        }
    }

    /**
     * Actualizar un método de pago existente
     */
    async update(id: string, updateMetodoPagoDto: UpdateMetodoPagoDto) {
        try {
            const updateData: any = { ...updateMetodoPagoDto };

            if (updateData.nombre) {
                updateData.nombre = updateData.nombre.toUpperCase();
            }

            const updatedMetodoPago = await this.metodoPagoModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).exec();

            if (!updatedMetodoPago) {
                throw new NotFoundException('Método de pago no encontrado');
            }

            return {
                success: true,
                metodoPago: updatedMetodoPago,
                message: 'Método de pago actualizado exitosamente',
            };
        } catch (error: any) {
            console.error('Error in update:', error);
            if (error.code === 11000) {
                throw new ConflictException('Ya existe un método de pago con ese nombre');
            }
            if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
            throw new InternalServerErrorException('Error al actualizar el método de pago');
        }
    }

    /**
     * Desactivar un método de pago (soft delete)
     */
    async softDelete(id: string) {
        try {
            const result = await this.metodoPagoModel.findByIdAndUpdate(
                id,
                { $set: { isActive: false } },
                { new: true }
            ).exec();

            if (!result) {
                throw new NotFoundException('Método de pago no encontrado');
            }

            return {
                success: true,
                message: 'Método de pago desactivado exitosamente',
            };
        } catch (error) {
            console.error('Error in softDelete:', error);
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al desactivar el método de pago');
        }
    }

    /**
     * Eliminar un método de pago permanentemente
     */
    async removePermanently(id: string) {
        try {
            const result = await this.metodoPagoModel.findByIdAndDelete(id).exec();

            if (!result) {
                throw new NotFoundException('Método de pago no encontrado');
            }

            return {
                success: true,
                message: 'Método de pago eliminado permanentemente',
            };
        } catch (error) {
            console.error('Error in removePermanently:', error);
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al eliminar el método de pago');
        }
    }

    /**
     * Inicializar métodos de pago por defecto
     */
    async initialize() {
        try {
            const metodosPagoPredefinidos = [
                'EFECTIVO',
                'TRANSFERENCIA',
                'TARJETA DEBITO',
                'TARJETA CREDITO',
                'MERCADO PAGO',
                'CHEQUE'
            ];

            let created = 0;

            for (const nombre of metodosPagoPredefinidos) {
                const exists = await this.metodoPagoModel.findOne({ nombre }).exec();

                if (!exists) {
                    await new this.metodoPagoModel({
                        nombre,
                        descripcion: null,
                        isActive: true,
                    }).save();
                    created++;
                }
            }

            return {
                success: true,
                message: `Inicialización completada. ${created} métodos de pago creados.`,
                created,
            };
        } catch (error) {
            console.error('Error in initialize:', error);
            throw new InternalServerErrorException('Error al inicializar los métodos de pago');
        }
    }

    /**
     * Buscar métodos de pago por nombre
     */
    async search(searchTerm: string) {
        try {
            const metodosPago = await this.metodoPagoModel
                .find({
                    isActive: true,
                    $or: [
                        { nombre: { $regex: searchTerm, $options: 'i' } },
                        { descripcion: { $regex: searchTerm, $options: 'i' } }
                    ]
                })
                .sort({ nombre: 1 })
                .exec();

            return {
                success: true,
                metodosPago,
                total: metodosPago.length,
            };
        } catch (error) {
            console.error('Error in search:', error);
            throw new InternalServerErrorException('Error al buscar los métodos de pago');
        }
    }

    /**
     * Obtener estadísticas de métodos de pago
     */
    async getStats() {
        try {
            const [totalMetodosPago, metodosPagoActivos, metodosPagoInactivos] = await Promise.all([
                this.metodoPagoModel.countDocuments({}).exec(),
                this.metodoPagoModel.countDocuments({ isActive: true }).exec(),
                this.metodoPagoModel.countDocuments({ isActive: false }).exec()
            ]);

            return {
                success: true,
                stats: {
                    totalMetodosPago,
                    metodosPagoActivos,
                    metodosPagoInactivos
                }
            };
        } catch (error) {
            console.error('Error in getStats:', error);
            throw new InternalServerErrorException('Error al obtener estadísticas de métodos de pago');
        }
    }
}
