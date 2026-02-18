import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationDto } from '../../common/dto/pagination/pagination.dto';
import { CouponType } from '../../common/enums/coupons-types.enum';
import { Coupon, CouponDocument } from '../../schemas/coupon.schema';
import { OptionsService } from '../options/options.service';
import { PaginationService } from '../pagination/pagination.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
    private readonly paginationService: PaginationService,
    private readonly optionsService: OptionsService,
  ) {}

  /**
   * Crea un nuevo cupón en el sistema
   * @param createCouponDto - DTO con los datos del cupón a crear
   * @throws BadRequestException si ya existe un cupón con el mismo código
   * @throws BadRequestException si el valor del cupón es inválido para su tipo
   * @throws BadRequestException si la opción de producto especificada no existe
   * @returns El cupón creado
   */
  async create(createCouponDto: CreateCouponDto): Promise<CouponDocument> {
    // Verificar si ya existe un cupón con el mismo código (case insensitive)
    const existCoupon = await this.couponModel
      .findOne({ code: { $regex: new RegExp(`^${createCouponDto.code}$`, 'i') } })
      .exec();
    if (existCoupon) {
      throw new BadRequestException('COUPON_ALREADY_EXISTS');
    }

    // Validar el tipo de cupón y su valor
    if (
      createCouponDto.type === CouponType.PERCENTAGE &&
      createCouponDto.value > 100
    ) {
      throw new BadRequestException('Invalid value for percentage coupon');
    }

    if (
      createCouponDto.type === CouponType.FIXED &&
      createCouponDto.value <= 0
    ) {
      throw new BadRequestException('Invalid value for fixed coupon');
    }

    // Validar que la opción de producto aplicable exista
    if (createCouponDto.applicableProductOption) {
      const optionExists = await this.optionsService.findOne(
        createCouponDto.applicableProductOption.toString(),
      );
      if (!optionExists) {
        throw new BadRequestException(
          'The specified applicableProductOption does not exist',
        );
      }
    }

    // Crear el nuevo cupón
    const newCoupon = new this.couponModel({
      ...createCouponDto,
      count: 0,
      usedByUsers: new Map<string, boolean>(),
    });

    return await newCoupon.save();
  }

  /**
   * Obtiene una lista paginada de todos los cupones
   * @param paginationDto - DTO con los parámetros de paginación
   * @returns Lista paginada de cupones
   */
  async findAll(paginationDto: PaginationDto) {
    return this.paginationService.paginate(
      this.couponModel,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  /**
   * Busca un cupón por su ID
   * @param id - ID del cupón a buscar
   * @throws NotFoundException si el cupón no existe
   * @returns El cupón encontrado
   */
  async findOneById(id: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findById(id).exec();
    if (!coupon) throw new NotFoundException('Coupon not found by ID');

    return coupon;
  }

  /**
   * Busca un cupón por su código
   * @param code - Código del cupón a buscar
   * @throws NotFoundException si el cupón no existe
   * @returns El cupón encontrado
   */
  async findOneByCode(code: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') } 
    }).exec();
    if (!coupon) {
      throw new NotFoundException('Coupon not found by CODE');
    }

    return coupon;
  }

  /**
   * Actualiza un cupón existente
   * @param id - ID del cupón a actualizar
   * @param updateCouponDto - DTO con los datos a actualizar
   * @throws NotFoundException si el cupón no existe
   * @throws BadRequestException si la opción de producto especificada no existe
   * @returns El cupón actualizado
   */
  async update(
    id: string,
    updateCouponDto: UpdateCouponDto,
  ): Promise<CouponDocument> {
    // Verificar que el cupón exista
    await this.findOneById(id);

    // Validar que la opción de producto aplicable exista si se está actualizando
    if (updateCouponDto.applicableProductOption) {
      const optionExists = await this.optionsService.findOne(
        updateCouponDto.applicableProductOption.toString(),
      );
      if (!optionExists) {
        throw new BadRequestException(
          'The specified applicableProductOption does not exist',
        );
      }
    }

    // Actualizar el cupón en la base de datos
    const updatedCoupon = await this.couponModel
      .findByIdAndUpdate(id, updateCouponDto, {
        new: true,
      })
      .exec();

    return updatedCoupon;
  }

  /**
   * Elimina un cupón del sistema
   * @param id - ID del cupón a eliminar
   * @throws NotFoundException si el cupón no existe
   * @returns El cupón eliminado
   */
  async remove(id: string): Promise<CouponDocument> {
    await this.findOneById(id); // Verificar que existe antes de eliminar
    return await this.couponModel.findByIdAndDelete(id).exec();
  }

  /**
   * Valida un cupón y calcula el descuento aplicable
   * @param code - Código del cupón a validar
   * @param userId - ID del usuario que intenta usar el cupón
   * @param products - Array de productos en el carrito con sus cantidades
   * @returns Objeto con el descuento calculado y si el cupón es válido
   * 
   * @example
   * // Para un cupón de tipo fijo
   * validateAndCalculateDiscount('CUPON10', 'user123', [{optionId: 'opt1', quantity: 2}])
   * // Returns: { discount: 1000, isValid: true }
   * 
   * // Para un cupón ya usado
   * validateAndCalculateDiscount('CUPON10', 'user123', [...])
   * // Returns: { discount: 0, isValid: false }
   */
  async validateAndCalculateDiscount(
    code: string,
    userId: string,
    products: Array<{ optionId: string; quantity: number }>,
  ): Promise<{ discount: number; isValid: boolean }> {
    try {
      const coupon = await this.findOneByCode(code);

      // Verificar si el cupón ha alcanzado su límite
      if (coupon.count >= coupon.limit) {
        return { discount: 0, isValid: false };
      }

      // Verificar si el usuario ya usó el cupón
      if (coupon.usedByUsers.get(userId)) {
        return { discount: 0, isValid: false };
      }

      let discount = 0;
      const subtotal = await this.calculateSubtotal(products);

      // Si hay una opción específica, verificar que esté en el carrito
      if (coupon.applicableProductOption) {
        const applicableProduct = products.find(
          (p) => p.optionId === coupon.applicableProductOption.toString(),
        );

        if (!applicableProduct) {
          return { discount: 0, isValid: false };
        }

        const option = await this.optionsService.findOne(
          applicableProduct.optionId,
        );
        const applicableQuantity = Math.min(
          applicableProduct.quantity,
          coupon.maxAplicableUnits || applicableProduct.quantity,
        );

        if (coupon.type === CouponType.FIXED) {
          discount = coupon.value * applicableQuantity;
        } else {
          discount = ((option.price * coupon.value) / 100) * applicableQuantity;
        }
      } else {
        // Cupón aplicable a toda la orden
        if (coupon.type === CouponType.FIXED) {
          discount = coupon.value;
        } else {
          discount = (subtotal * coupon.value) / 100;
        }
      }

      return { discount, isValid: true };
    } catch (error) {
      return { discount: 0, isValid: false };
    }
  }

  /**
   * Calcula el subtotal de los productos en el carrito
   * @param products - Array de productos con sus cantidades
   * @returns El subtotal calculado
   * @private
   */
  private async calculateSubtotal(
    products: Array<{ optionId: string; quantity: number }>,
  ): Promise<number> {
    let subtotal = 0;
    for (const product of products) {
      const option = await this.optionsService.findOne(product.optionId);
      subtotal += option.price * product.quantity;
    }
    return subtotal;
  }
}
