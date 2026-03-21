import {
    Injectable,
    NotFoundException,
    ConflictException,
    InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoriaGestor } from '../../schemas/categorias-gestor.schema';
import { CreateCategoriaGestorDto } from './dto/create-categoria-gestor.dto';
import { UpdateCategoriaGestorDto } from './dto/update-categoria-gestor.dto';

@Injectable()
export class CategoriasGestorService {
    constructor(
        @InjectModel(CategoriaGestor.name)
        private readonly categoriaGestorModel: Model<CategoriaGestor>,
    ) { }

    /**
     * Obtener todas las categorías activas
     */
    async findAllActive() {
        try {
            const categorias = await this.categoriaGestorModel
                .find({ isActive: true })
                .sort({ nombre: 1 })
                .exec();

            return {
                categorias,
                total: categorias.length,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener las categorías activas');
        }
    }


    async findAll() {
        try {
            const categorias = await this.categoriaGestorModel
                .find({ isActive: true })
                .sort({ nombre: 1 })
                .exec();

            return {
                categorias,
                total: categorias.length,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener las categorías');
        }
    }

    /**
     * Obtener una categoría por ID
     */
    async findOne(id: string) {
        try {
            const categoria = await this.categoriaGestorModel.findById(id).exec();
            if (!categoria) {
                throw new NotFoundException('Categoría no encontrada');
            }
            return categoria;
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al obtener la categoría');
        }
    }

    /**
     * Crear una nueva categoría
     */
    async create(createCategoriaDto: CreateCategoriaGestorDto) {
        const normalizedNombre = createCategoriaDto.nombre.trim().replace(/\s+/g, ' ').toUpperCase();

        try {
            if (!normalizedNombre) {
                throw new ConflictException('El nombre de la categoría no puede estar vacío');
            }

            const existingCategoria = await this.categoriaGestorModel.findOne({
                nombre: normalizedNombre,
            });

            if (existingCategoria) {
                throw new ConflictException(`Ya existe una categoría con ese nombre: "${existingCategoria.nombre}"`);
            }

            const newCategoria = new this.categoriaGestorModel({
                nombre: normalizedNombre,
                descripcion: createCategoriaDto.descripcion,
                isActive: createCategoriaDto.isActive ?? true,
            });

            return await newCategoria.save();
        } catch (error: any) {
            if (error.code === 11000 || error.name === 'MongoServerError' && error.code === 11000) {
                throw new ConflictException('Ya existe una categoría con ese nombre');
            }
            if (error instanceof ConflictException) throw error;
            throw new InternalServerErrorException(error.message || 'Error al crear la categoría');
        }
    }

    /**
     * Actualizar una categoría existente
     */
    async update(id: string, updateCategoriaDto: UpdateCategoriaGestorDto) {
        try {
            const updateData: any = { ...updateCategoriaDto };

            if (updateData.nombre) {
                const normalizedNombre = updateData.nombre.trim().replace(/\s+/g, ' ').toUpperCase();
                if (!normalizedNombre) {
                    throw new ConflictException('El nombre de la categoría no puede estar vacío');
                }
                updateData.nombre = normalizedNombre;
            }

            const updatedCategoria = await this.categoriaGestorModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true, runValidators: true }
            ).exec();

            if (!updatedCategoria) {
                throw new NotFoundException('Categoría no encontrada');
            }

            return updatedCategoria;
        } catch (error: any) {
            if (error.code === 11000) {
                throw new ConflictException('Ya existe una categoría con ese nombre');
            }
            if (error instanceof NotFoundException || error instanceof ConflictException) throw error;
            throw new InternalServerErrorException('Error al actualizar la categoría');
        }
    }

    /**
     * Desactivar una categoría (soft delete)
     */
    async softDelete(id: string) {
        try {
            const result = await this.categoriaGestorModel.findByIdAndUpdate(
                id,
                { $set: { isActive: false } },
                { new: true }
            ).exec();

            if (!result) {
                throw new NotFoundException('Categoría no encontrada');
            }

            return { message: 'Categoría desactivada exitosamente' };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al desactivar la categoría');
        }
    }

    /**
     * Eliminar una categoría permanentemente
     */
    async removePermanently(id: string) {
        try {
            const result = await this.categoriaGestorModel.findByIdAndDelete(id).exec();

            if (!result) {
                throw new NotFoundException('Categoría no encontrada');
            }

            return { message: 'Categoría eliminada permanentemente' };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            throw new InternalServerErrorException('Error al eliminar la categoría');
        }
    }

    /**
     * Inicializar categorías por defecto
     */
    async initialize() {
        try {
            const categoriasPredefinidas = [
                'SUELDOS',
                'IMPUESTOS',
                'MANTENIMIENTO MAQUINARIA',
                'INSUMOS',
                'MATERIA PRIMA',
                'SERVICIOS',
                'FLETE',
                'LIMPIEZA',
                'ALQUILERES',
                'UTILES',
                'PUBLICIDAD',
                'MANTENIMIENTO EDILICIO',
                'OTROS',
                'CAJA CHICA',
                'VIATICOS',
                'VEHICULOS',
                'COMBUSTIBLE',
                'OFICINA',
                'FINANCIACION',
                'INVERSION EDILICIA',
                'INDUMENTARIA',
                'INVERSION PRODUCTO',
                'PRODUCTOS',
                'INVERSION TECNOLOGICA',
                'I&D'
            ];

            let created = 0;

            for (const nombre of categoriasPredefinidas) {
                const exists = await this.categoriaGestorModel.findOne({ nombre }).exec();

                if (!exists) {
                    await new this.categoriaGestorModel({
                        nombre,
                        descripcion: null,
                        isActive: true,
                    }).save();
                    created++;
                }
            }

            return {
                message: `Inicialización completada. ${created} categorías creadas.`,
                created,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al inicializar las categorías');
        }
    }

    /**
     * Crear categoría SUELDOS si no existe
     */
    async ensureSueldosCategory() {
        try {
            let existingCategory = await this.categoriaGestorModel.findOne({ nombre: 'SUELDOS' }).exec();

            if (!existingCategory) {
                const newCategory = new this.categoriaGestorModel({
                    nombre: 'SUELDOS',
                    descripcion: 'Gastos relacionados con salarios y remuneraciones',
                    isActive: true,
                });
                existingCategory = await newCategory.save();
                return { message: 'Categoría SUELDOS creada exitosamente', categoria: existingCategory };
            }

            return { message: 'La categoría SUELDOS ya existe', categoria: existingCategory };
        } catch (error) {
            throw new InternalServerErrorException('Error al crear la categoría SUELDOS');
        }
    }

    /**
     * Buscar categorías por nombre o descripción
     */
    async search(searchTerm: string) {
        try {
            const regex = new RegExp(searchTerm, 'i');
            const categorias = await this.categoriaGestorModel
                .find({
                    isActive: true,
                    $or: [
                        { nombre: regex },
                        { descripcion: regex },
                    ],
                })
                .sort({ nombre: 1 })
                .exec();

            return {
                categorias,
                total: categorias.length,
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al buscar las categorías');
        }
    }

    /**
     * Obtener estadísticas de categorías
     */
    async getStats() {
        try {
            const [totalCategorias, categoriasActivas, categoriasInactivas] = await Promise.all([
                this.categoriaGestorModel.countDocuments({}).exec(),
                this.categoriaGestorModel.countDocuments({ isActive: true }).exec(),
                this.categoriaGestorModel.countDocuments({ isActive: false }).exec()
            ]);

            return {
                totalCategorias,
                categoriasActivas,
                categoriasInactivas
            };
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener estadísticas de categorías');
        }
    }
}
