import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Discount, DiscountDocument } from '../../schemas/discount.schema';
import { OptionDocument } from '../../schemas/option.schema';
import { OptionsService } from '../options/options.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectModel(Discount.name)
    private discountModel: Model<DiscountDocument>,
    private optionsService: OptionsService,
  ) {}

  /**
   * Crea un nuevo descuento
   * @param createDiscountDto - DTO con los datos del descuento a crear
   * @throws BadRequestException si alguna de las opciones especificadas no existe
   * @returns El descuento creado
   */
  async create(createDiscountDto: CreateDiscountDto): Promise<Discount> {
    // Validar que todas las opciones existan
    const invalidOptions = [];
    for (const optionId of createDiscountDto.applicableOptionIds) {
      try {
        await this.optionsService.findOne(optionId.toString());
      } catch (error) {
        invalidOptions.push(optionId);
      }
    }

    if (invalidOptions.length > 0) {
      throw new BadRequestException(
        `Las siguientes opciones no existen: ${invalidOptions.join(', ')}`,
      );
    }

    const createdDiscount = new this.discountModel(createDiscountDto);
    return createdDiscount.save();
  }

  /**
   * Obtiene todos los descuentos existentes
   * @returns Lista de todos los descuentos
   */
  async findAll(): Promise<Discount[]> {
    return this.discountModel.find().exec();
  }

  /**
   * Obtiene solo los descuentos que están activos
   * @returns Lista de descuentos activos
   */
  async findActive(): Promise<Discount[]> {
    return this.discountModel.find({ isActive: true }).exec();
  }

  /**
   * Obtiene un descuento por su ID
   * @param id - ID del descuento a buscar
   * @throws NotFoundException si el descuento no existe
   * @returns El descuento encontrado
   */
  async findById(id: string): Promise<Discount> {
    const discount = await this.discountModel.findById(id).exec();
    if (!discount) {
      throw new NotFoundException('Descuento no encontrado');
    }
    return discount;
  }

  /**
   * Calcula el descuento para una opción específica y una cantidad
   * @param optionId - ID de la opción para la cual calcular el descuento
   * @param quantity - Cantidad de items de esa opción
   * @param allCartItems - Array con todas las opciones y cantidades en el carrito
   * @returns Monto total del descuento
   * 
   * @example
   * Para un descuento con:
   * - initialQuantity: 2
   * - initialDiscountAmount: 5000
   * - additionalDiscountAmount: 5000
   * 
   * Si hay en el carrito:
   * - Opción A: 2 unidades
   * - Opción B: 1 unidad
   * - Opción C: 1 unidad
   * Y todas son aplicables, entonces total = 4:
   * - Por las primeras 2 unidades: 5000
   * - Por las 2 unidades adicionales: 2 * 5000 = 10000
   * - Total descuento: 15000
   */
  async calculateDiscount(
    optionId: string,
    quantity: number,
    allCartItems: Array<{ optionId: string; quantity: number }> = [],
  ): Promise<number> {
    const activeDiscounts = await this.discountModel
      .find({
        isActive: true,
      })
      .exec();

    let totalDiscount = 0;

    for (const discount of activeDiscounts) {
      const applicableOptionIds = discount.applicableOptionIds.map(id => id.toString());
      
      // Verificar si la opción actual está en las opciones aplicables del descuento
      if (applicableOptionIds.includes(optionId)) {
        // Sumar las cantidades de todas las opciones aplicables en el carrito
        const totalQuantityInCart = allCartItems.reduce((sum, item) => {
          if (applicableOptionIds.includes(item.optionId)) {
            return sum + item.quantity;
          }
          return sum;
        }, 0);

        if (totalQuantityInCart >= discount.initialQuantity) {
          // Distribuir el descuento proporcionalmente según la cantidad de esta opción
          const proportionalFactor = quantity / totalQuantityInCart;
          
          // Aplicar descuento inicial proporcional
          totalDiscount += discount.initialDiscountAmount * proportionalFactor;

          // Calcular unidades adicionales después de la cantidad inicial
          const additionalUnits = totalQuantityInCart - discount.initialQuantity;

          if (additionalUnits > 0 && discount.additionalDiscountAmount) {
            // Aplicar descuento por unidades adicionales proporcional
            totalDiscount += (additionalUnits * discount.additionalDiscountAmount) * proportionalFactor;
          }
        }
      }
    }

    return totalDiscount;
  }

  /**
   * Calcula el descuento total para un conjunto de items del carrito
   * @param items - Array de objetos con optionId y quantity
   * @returns Suma total de todos los descuentos aplicables
   * 
   * @example
   * Para un carrito con:
   * [
   *   { optionId: "id1", quantity: 3 },
   *   { optionId: "id2", quantity: 2 }
   * ]
   * 
   * Calculará el descuento para cada item y retornará la suma
   */
  async calculateCartDiscounts(items: Array<{ optionId: string, quantity: number }>): Promise<number> {
    let totalDiscount = 0;

    for (const item of items) {
      const itemDiscount = await this.calculateDiscount(item.optionId, item.quantity, items);
      totalDiscount += itemDiscount;
    }

    return totalDiscount;
  }

  /**
   * Obtiene el precio de una opción específica
   * @param optionId - ID de la opción
   * @returns Objeto con el precio y otros detalles de la opción
   * @throws NotFoundException si la opción no existe
   */
  async getOptionPrice(optionId: string) {
    const option = await this.optionsService.findOne(optionId) as OptionDocument;
    return {
      price: option.price,
      name: option.name,
      id: option._id,
    };
  }

  /**
   * Encuentra todos los descuentos activos para una opción específica
   * @param optionId - ID de la opción
   * @returns Array de descuentos activos aplicables a la opción
   */
  async findActiveDiscountsByOptionId(optionId: string): Promise<Discount[]> {
    return this.discountModel.find({
      isActive: true,
      applicableOptionIds: new Types.ObjectId(optionId),
    }).exec();
  }

  /**
   * Actualiza un descuento existente
   * @param id - ID del descuento a actualizar
   * @param updateDiscountDto - DTO con los datos a actualizar
   * @throws NotFoundException si el descuento no existe
   * @throws BadRequestException si alguna de las opciones especificadas no existe
   * @returns El descuento actualizado
   */
  async update(id: string, updateDiscountDto: UpdateDiscountDto): Promise<Discount> {
    const discount = await this.discountModel.findById(id);
    if (!discount) {
      throw new NotFoundException('Descuento no encontrado');
    }

    // Validar que todas las nuevas opciones existan si se están actualizando
    if (updateDiscountDto.applicableOptionIds) {
      const invalidOptions = [];
      for (const optionId of updateDiscountDto.applicableOptionIds) {
        try {
          await this.optionsService.findOne(optionId.toString());
        } catch (error) {
          invalidOptions.push(optionId);
        }
      }

      if (invalidOptions.length > 0) {
        throw new BadRequestException(
          `Las siguientes opciones no existen: ${invalidOptions.join(', ')}`,
        );
      }
    }

    const updatedDiscount = await this.discountModel
      .findByIdAndUpdate(id, updateDiscountDto, { new: true })
      .exec();

    return updatedDiscount;
  }

  /**
   * Elimina un descuento del sistema
   * @param id - ID del descuento a eliminar
   * @throws NotFoundException si el descuento no existe
   * @returns El descuento eliminado
   */
  async remove(id: string): Promise<Discount> {
    const discount = await this.discountModel.findById(id);
    if (!discount) {
      throw new NotFoundException('Descuento no encontrado');
    }

    return await this.discountModel.findByIdAndDelete(id).exec();
  }
} 