export function calculatePercentageDiscount(
  products: any[],
  couponValue: number,
  applicableProduct: string | null,
): number {
  let discount = 0;
  const applicableProducts = products.filter(
    (product) => !applicableProduct || product.productId === applicableProduct,
  );

  discount = applicableProducts.reduce((total, product) => {
    const productTotal = product.options.reduce(
      (optionTotal, option) => optionTotal + option.quantity * option.price,
      0,
    );
    return total + (productTotal * couponValue) / 100;
  }, 0);

  return discount;
}

export function calculateFixedDiscount(
  products: any[],
  couponValue: number,
  applicableProduct: string | null,
): number {
  let discount = 0;
  const applicableProducts = products.filter(
    (product) => !applicableProduct || product.productId === applicableProduct,
  );

  discount =
    couponValue *
    applicableProducts.reduce(
      (total, product) =>
        total +
        product.options.reduce(
          (optionTotal, option) => optionTotal + option.quantity,
          0,
        ),
      0,
    );

  return discount;
}
