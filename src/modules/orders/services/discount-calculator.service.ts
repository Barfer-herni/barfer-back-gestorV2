import { Injectable } from '@nestjs/common';
import { PaymentMethods } from '../../../common/enums/payment-methods.enum';
import { DiscountsService } from '../../discounts/discounts.service';
import { CouponsService } from '../../coupons/coupons.service';
import { CartDto } from '../dto/cart.dto';
import { DiscountResult, DiscountType, OrderDiscounts } from '../interfaces/discount.interface';

@Injectable()
export class DiscountCalculatorService {
  constructor(
    private readonly discountsService: DiscountsService,
    private readonly couponsService: CouponsService,
  ) {}

  /**
   * Calcula todos los descuentos aplicables a una orden
   * @param cart - Información del carrito
   * @param paymentMethod - Método de pago seleccionado
   * @returns Objeto con todos los descuentos calculados
   */
  async calculateOrderDiscounts(
    cart: CartDto,
    paymentMethod: number,
  ): Promise<OrderDiscounts> {
    // Primero calculamos los descuentos por producto
    const productDiscounts = await this.calculateProductDiscounts(cart);
    const productDiscountsTotal = this.sumDiscounts(productDiscounts);

    // Calculamos el subtotal inicial
    const subtotal = await this.calculateSubtotal(cart);
    
    // Calculamos el descuento por cupón
    const couponDiscount = await this.calculateCouponDiscount(cart);

    // Calculamos el subtotal después de todos los descuentos (productos y cupón)
    const subtotalAfterDiscounts = +(subtotal - productDiscountsTotal - (couponDiscount?.amount || 0)).toFixed(2);

    // Por último calculamos el descuento en efectivo sobre el nuevo subtotal
    const cashDiscount = await this.calculateCashPaymentDiscount(
      subtotalAfterDiscounts,
      paymentMethod,
    );

    const totalDiscount = +(
      productDiscountsTotal +
      (couponDiscount?.amount || 0) +
      (cashDiscount?.amount || 0)
    ).toFixed(2);

    return {
      productDiscounts,
      cashPaymentDiscount: cashDiscount,
      couponDiscount,
      totalDiscount,
    };
  }

  /**
   * Calcula los descuentos aplicables a los productos del carrito
   * @param cart - Información del carrito
   * @returns Array de descuentos por producto
   */
  private async calculateProductDiscounts(
    cart: CartDto,
  ): Promise<DiscountResult[]> {
    const discounts: DiscountResult[] = [];

    for (const product of cart.products) {
      const discount = await this.discountsService.calculateDiscount(
        product.optionId,
        product.quantity,
        cart.products,
      );

      if (discount > 0) {
        discounts.push({
          amount: discount,
          type: DiscountType.PRODUCT_DISCOUNT,
          description: `Descuento por cantidad en producto`,
        });
      }
    }

    return discounts;
  }

  /**
   * Calcula el descuento por pago en efectivo si aplica
   * @param subtotalAfterDiscounts - Subtotal después de descuentos por producto
   * @param paymentMethod - Método de pago seleccionado
   * @returns Descuento por pago en efectivo o undefined si no aplica
   */
  private async calculateCashPaymentDiscount(
    subtotalAfterDiscounts: number,
    paymentMethod: number,
  ): Promise<DiscountResult | undefined> {
    if (PaymentMethods[paymentMethod] === PaymentMethods[2]) {
      const cashDiscount = +(subtotalAfterDiscounts * 0.10).toFixed(2);

      return {
        amount: cashDiscount,
        type: DiscountType.CASH_PAYMENT,
        description: 'Descuento del 10% por pago en efectivo',
      };
    }
    return undefined;
  }

  /**
   * Calcula el descuento por cupón si existe y es válido
   * @param cart - Información del carrito
   * @returns Descuento por cupón o undefined si no aplica
   */
  private async calculateCouponDiscount(
    cart: CartDto,
  ): Promise<DiscountResult | undefined> {
    if (!cart.coupon) return undefined;

    const { discount, isValid } = await this.couponsService.validateAndCalculateDiscount(
      cart.coupon,
      cart.userId,
      cart.products,
    );

    if (isValid && discount > 0) {
      return {
        amount: discount,
        type: DiscountType.COUPON,
        description: `Descuento aplicado por cupón ${cart.coupon}`,
      };
    }

    return undefined;
  }

  /**
   * Calcula el subtotal del carrito sin descuentos
   * @param cart - Información del carrito
   * @returns Subtotal calculado
   */
  private async calculateSubtotal(cart: CartDto): Promise<number> {
    let subtotal = 0;
    for (const product of cart.products) {
      const option = await this.discountsService.getOptionPrice(product.optionId);
      subtotal += option.price * product.quantity;
    }
    return +subtotal.toFixed(2);
  }

  /**
   * Suma los montos de un array de descuentos
   * @param discounts - Array de descuentos a sumar
   * @returns Suma total de los descuentos
   */
  private sumDiscounts(discounts: DiscountResult[]): number {
    return discounts.reduce((sum, discount) => sum + discount.amount, 0);
  }
} 