/**
 * Representa el resultado de un cálculo de descuento
 */
export interface DiscountResult {
  amount: number;
  type: DiscountType;
  description: string;
}

/**
 * Tipos de descuento disponibles en el sistema
 */
export enum DiscountType {
  PRODUCT_DISCOUNT = 'PRODUCT_DISCOUNT',
  CASH_PAYMENT = 'CASH_PAYMENT',
  COUPON = 'COUPON'
}

/**
 * Representa el resumen de todos los descuentos aplicados a una orden
 */
export interface OrderDiscounts {
  productDiscounts: DiscountResult[];
  cashPaymentDiscount?: DiscountResult;
  couponDiscount?: DiscountResult;
  totalDiscount: number;
} 