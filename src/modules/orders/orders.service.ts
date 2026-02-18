import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaginationDto } from '../../common/dto/pagination/pagination.dto';
import { CouponType } from '../../common/enums/coupons-types.enum';
import { OrderStatus } from '../../common/enums/order-status.enum';
import { PaymentMethods } from '../../common/enums/payment-methods.enum';
import { Coupon } from '../../schemas/coupon.schema';
import { Option } from '../../schemas/option.schema';
import { Order } from '../../schemas/order.schema';
import { AddressService } from '../address/address.service';
import { AddressDto } from '../address/dto/address.dto';
import { CouponsService } from '../coupons/coupons.service';
import { DeliveryAreasService } from '../delivery-areas/delivery-areas.service';
import { DeliveryAreaDto } from '../delivery-areas/dto/delivery-area.dto';
import { GoogleSheetsService } from '../google-sheet/google-sheet.service';
import { DeliverySheetService } from '../google-sheet/delivery-sheet.service';
import { MailerService } from '../mailer/mailer.service';
import { MpItemDto } from '../mercado-pago/dto/item.dto';
import { MpOrderDto } from '../mercado-pago/dto/order-mp.dto';
import { PayerDto } from '../mercado-pago/dto/payer.dto';
import { MercadoPagoService } from '../mercado-pago/mercado-pago.service';
import { MetaConversionsService } from '../meta-conversions/meta-conversions.service';
import { OptionResponseDto } from '../options/dto/option-response.dto';
import { OptionsService } from '../options/options.service';
import { PaginationService } from '../pagination/pagination.service';
import { ProductResponseDto } from '../products/dto/product-response.dto';
import { ProductDto } from '../products/dto/product.dto';
import { ProductsService } from '../products/products.service';
import { UserDto } from '../users/dto/user.dto';
import { UsersService } from '../users/users.service';
import { CartDto } from './dto/cart.dto';
import { FindOptionsDto } from './dto/find-options.dto';
import { OrderDto } from './dto/order.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { DiscountCalculatorService } from './services/discount-calculator.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly addressService: AddressService,
    private readonly deliveryAreaService: DeliveryAreasService,
    private readonly configService: ConfigService,
    private readonly optionsService: OptionsService,
    private readonly mercadoPagoService: MercadoPagoService,
    private readonly couponService: CouponsService,
    private readonly paginationService: PaginationService,
    private readonly googleSheetsService: GoogleSheetsService,
    private readonly deliverySheetService: DeliverySheetService,
    private readonly mailerService: MailerService,
    private readonly metaConversionsService: MetaConversionsService,
    private readonly discountCalculatorService: DiscountCalculatorService,
  ) {}

  /**
   * Crea una nueva orden
   * @param createOrderDto - DTO con los datos de la orden
   * @param clientIp - IP del cliente para tracking
   * @param userAgent - User agent del cliente para tracking
   * @returns La orden creada y datos adicionales según el método de pago
   */
  async create(createOrderDto: OrderDto, clientIp: string, userAgent: string) {
    const { userId, addressId, deliveryAreaId, coupon } = createOrderDto;

    // Obtener datos necesarios
    const [user, address, deliveryArea] = await Promise.all([
      this.usersService.findById(userId),
      this.addressService.findOneById(addressId),
      this.deliveryAreaService.findOneById(deliveryAreaId),
    ]);

    // Validar stock antes de proceder
    await this.validateStock(createOrderDto.items);

    // Crear CartDto para cálculos de descuentos
    const cartDto: CartDto = {
      userId,
      coupon,
      products: createOrderDto.items.map((item) => ({
        productId: item.productId,
        optionId: item.options[0].id,
        quantity: item.options[0].quantity,
      })),
    };

    // Calcular todos los descuentos aplicables
    const discounts =
      await this.discountCalculatorService.calculateOrderDiscounts(
        cartDto,
        createOrderDto.paymentMethod,
      );

    // Construir la orden con los descuentos calculados
    const barferOrder = await this.buildBarferOrder(
      createOrderDto.items,
      address,
      user,
      createOrderDto.notes,
      createOrderDto.paymentMethod,
      createOrderDto.shippingPrice,
      OrderStatus[1],
      coupon,
      deliveryArea,
      discounts.totalDiscount,
      createOrderDto.deliveryDate,
      discounts.couponDiscount?.amount || 0,
    );

    const orderSchema = await this.orderModel.create(barferOrder);
    const orderSaved = await orderSchema.save();

    // Actualizar uso del cupón si existe
    if (coupon && discounts.couponDiscount) {
      await this.updateCouponUsage(coupon, userId);
    }

    // Si es pago por transferencia y entrega en el día
    if (
      PaymentMethods[createOrderDto.paymentMethod] === PaymentMethods[9] &&
      deliveryArea.sameDayDelivery
    ) {
      // Agregar a la hoja de la zona correspondiente
      await this.deliverySheetService.addOrderToZoneSheet(
        orderSaved,
        deliveryArea.sheetName,
      );

      return {
        BFOrder: orderSaved,
        redirectToWhatsapp: true,
        whatsappNumber: deliveryArea.whatsappNumber,
      };
    }

    // Enviar correo de confirmación para pagos en efectivo
    if (PaymentMethods[createOrderDto.paymentMethod] === PaymentMethods[2]) {
      await this.mailerService.sendOrderConfirmationEmail(
        orderSaved.user.email,
        orderSaved,
      );
    }

    // Procesar pago con Mercado Pago si corresponde
    if (PaymentMethods[createOrderDto.paymentMethod] === PaymentMethods[11]) {
      const mpOrder = await this.buildMercadoPagoOrder(
        barferOrder,
        coupon,
        orderSaved,
        discounts.totalDiscount,
      );

      await this.googleSheetsService.addOrderToSheet(orderSaved);

      return {
        MPOrder: mpOrder,
        BFOrder: orderSaved,
      };
    }

    // Procesar pago con Payway si corresponde
    if (PaymentMethods[createOrderDto.paymentMethod] === PaymentMethods[12]) {
      await this.googleSheetsService.addOrderToSheet(orderSaved);

      return {
        BFOrder: orderSaved,
        paymentType: 'payway',
      };
    }

    // Para otros métodos de pago
    await this.googleSheetsService.addOrderToSheet(orderSaved);
    await this.googleSheetsService.verifyDataInSheet();

    // Registrar conversión en Meta
    try {
      const totalValue = barferOrder.items.reduce(
        (acc, item) => acc + item.options[0].price * item.options[0].quantity,
        0,
      );

      await this.metaConversionsService.trackPurchase(
        String(orderSaved._id),
        totalValue,
        clientIp,
        userAgent,
        orderSaved.user.email,
      );
    } catch (error) {
      console.error(
        `[Meta Tracking Error] Failed to track purchase for order ${orderSaved._id}:`,
        error.message,
      );
    }

    return {
      BFOrder: orderSaved,
    };
  }

  private async updateCouponUsage(coupon: any, userId: string) {
    // Encontrar el cupón por ID
    const couponRecord = await this.couponService.findOneByCode(coupon);

    // Incrementar el contador
    couponRecord.count += 1;

    // Registrar al usuario en usedByUsers
    couponRecord.usedByUsers.set(userId, true);

    // Guardar los cambios en el cupón
    await this.couponService.update(
      couponRecord?.id || couponRecord?._id,
      couponRecord,
    );
  }

  async buildBarferOrder(
    products: any,
    address: any,
    user: any,
    notes: string,
    paymentMethod: number,
    shippingPrice: number,
    status: string,
    coupon: string,
    deliveryArea: any,
    discount: number, // Descuento calculado que se aplicará directamente
    deliveryDate: string, // Incluir la fecha de entrega
    couponDiscount: number, // Nuevo: incluir el monto descontado por el cupón
  ) {
    const [barferProducts, addressOrder, userOrder, deliveryAreaOrder] =
      await Promise.all([
        this.buildProductsOrder(products),
        this.buildAddressOrder(address),
        this.buildUserORder(user),
        this.buildDeliveryAreaOrder(deliveryArea),
      ]);

    const subTotal = barferProducts.reduce(
      (acc, product) => acc + product.price,
      0,
    );
    const validShippingPrice = shippingPrice > 0 ? shippingPrice : 0;

    // Aplicar los descuentos ya calculados (incluye descuentos por cantidad, cupón y efectivo)
    let total = subTotal + validShippingPrice - discount;

    // Asegurar que el total no sea negativo
    if (total < 0) {
      total = 0;
    }

    // Convertir deliveryDate (string) a deliveryDay (Date)
    const deliveryDay = this.parseDeliveryDateToDay(deliveryDate);

    const barferOrder = {
      status: status,
      total,
      items: barferProducts,
      subTotal,
      discount,
      shippingPrice: validShippingPrice,
      notes,
      address: addressOrder,
      user: userOrder,
      paymentMethod: PaymentMethods[paymentMethod],
      coupon: coupon || null,
      deliveryArea: deliveryAreaOrder,
      deliveryDate: deliveryDate, // Guardar la fecha de entrega en la orden
      deliveryDay: deliveryDay, // Guardar la fecha de entrega como Date
      couponDiscount, // Guardar el descuento del cupón
    };

    return barferOrder;
  }

  async buildMercadoPagoOrder(
    barferOrder: any,
    coupon: any,
    orderSaved: any,
    totalDiscount: number,
  ) {
    const mpItems = await this.buildMPItems(barferOrder.items, totalDiscount);
    const payer: PayerDto = {
      name: barferOrder.user.name,
      surname: barferOrder.user.lastName,
      email: barferOrder.user.email,
    };

    const mpOrder: MpOrderDto = {
      items: mpItems,
      payer: payer,
      picture_url: barferOrder.items[0].images[0],
      auto_return: 'approved',
      notification_url: `${this.configService.get<string>('BACKEND_BASE_URL')}/api/v1/barfer/orders/mercadopago/webhook`,
      external_reference: orderSaved?._id.toString(),
      back_urls: {
        success:
          'https://barf-ecommerce-client.vercel.app/carrito/pago-exitoso?orderId=' +
          orderSaved?._id,
        pending:
          'https://barf-ecommerce-client.vercel.app/carrito/pago-erroneo',
        failure:
          'https://barf-ecommerce-client.vercel.app/carrito/pago-erroneo',
      },
    };

    return await this.mercadoPagoService.create(mpOrder);
  }

  async buildMPItems(
    items: any[],
    totalDiscount: number,
  ): Promise<MpItemDto[]> {
    const mpItems: MpItemDto[] = [];

    // Paso 1: Calcular el total de cantidades
    const totalQuantity = items.reduce(
      (sum, item) => sum + item.options[0].quantity,
      0,
    );

    // Validar que el totalQuantity no sea 0 (evitar divisiones por 0)
    if (totalQuantity === 0) {
      throw new Error('[MP Items Error] No items found with valid quantities');
    }

    let remainingDiscount = totalDiscount;

    items.forEach((item) => {
      const quantity = item.options[0].quantity || 1;

      // Paso 2: Calcular la proporción del descuento
      const itemProportion = quantity / totalQuantity;
      const discountForItem = Math.min(
        remainingDiscount,
        Math.round(itemProportion * totalDiscount),
      );

      // Calcular el precio unitario después del descuento
      const itemUnitPrice = item.price - discountForItem;

      // Actualizar el descuento restante
      remainingDiscount -= discountForItem;

      // Crear el ítem para Mercado Pago
      const mpItem: MpItemDto = {
        id: item.productId,
        title: item.name,
        unit_price: parseFloat(itemUnitPrice.toFixed(2)),
        category: item.category,
        quantity: 1,
        currency_id: 'ARS',
        description: item.description,
        picture_url: item.images[0],
      };

      mpItems.push(mpItem);
    });

    return mpItems;
  }

  async getProductsFromDB(productIds: string[]): Promise<ProductResponseDto[]> {
    const products: ProductResponseDto[] =
      await this.productsService.findManyByIds(productIds);
    return products;
  }

  async getOptionsFromDB(options: any[]): Promise<OptionResponseDto[]> {
    const allOptions: OptionResponseDto[] = [];

    options.map(async (option) => {
      const opFromDB = await this.optionsService.findOne(option.id);
      allOptions.push(opFromDB);
    });

    return allOptions;
  }

  async subTotal(products: ProductDto[]): Promise<number> {
    const subTotal = products.reduce((acc, product) => {
      const productTotal = product.options.reduce((optionAcc, option) => {
        if (option && option.total) {
          return optionAcc + option.total;
        }
        return optionAcc;
      }, 0);
      return acc + productTotal;
    }, 0);

    return subTotal;
  }

  async buildProductsOrder(products: any): Promise<ProductDto[]> {
    const productsOrder: ProductDto[] = [];
    for await (const product of products) {
      const productFromDb = await this.productsService.findOneById(
        product.productId,
      );

      const optionsFromDb = [];
      for await (const op of product.options) {
        const option = await this.optionsService.findOne(op.id);
        optionsFromDb.push({
          _id: op.id,
          name: option.name,
          price: option.price,
          stock: option.stock,
          productId: option.productId,
          description: option.description,
        } as OptionResponseDto);
      }

      const optionsIds = product.options.map((option: any) => {
        return {
          id: option.id,
          quantity: option.quantity,
        };
      });

      const prices = await this.calculateTotalPrices(optionsIds, optionsFromDb);

      for (const option of optionsFromDb) {
        for (const op of optionsIds) {
          if (op.id === option?._id.toString()) {
            option.quantity = op.quantity;
          }
        }
      }

      const productOrder: ProductDto = {
        id: productFromDb.id.toString(),
        name: productFromDb.name,
        description: productFromDb.description,
        category: product.category,
        images: productFromDb.images,
        options: optionsFromDb,
        price: prices.reduce((acc, price) => acc + price, 0),
        salesCount: 0,
        discountApplied: product.discountApplied,
      };

      productsOrder.push(productOrder);
    }

    return productsOrder;
  }

  async calculateTotalPrices(optionsIds: any[], optionsFromDb: any[]) {
    return optionsIds.map((item, index) => {
      const quantity = item.quantity;
      const optionFromDb = optionsFromDb[index];

      if (!optionFromDb) {
        throw new Error(`Option not found for index ${index}`);
      }

      const price = optionFromDb.price || optionFromDb._doc?.price;
      if (price === undefined) {
        throw new Error(`Price not found for option at index ${index}`);
      }

      return quantity * price;
    });
  }

  async buildProductsOptions(
    options: FindOptionsDto[],
  ): Promise<OptionResponseDto[]> {
    if (!options) throw new BadRequestException('Options cant be empty');

    const productOptions = await Promise.all(
      options.map(async (option) => {
        const op: Option = await this.optionsService.findOne(option.id);
        return {
          name: op.name,
          price: op.price,
          stock: op.stock,
          productId: op.productId,
          description: op.description,
          quantity: option.quantity,
          total: op.price * option.quantity,
        } as OptionResponseDto;
      }),
    );

    return productOptions;
  }

  async buildAddressOrder(address: any): Promise<AddressDto> {
    const addressOrder: AddressDto = {
      userId: address.userId,
      address: address.address,
      reference: address.reference,
      firstName: address.firstName,
      lastName: address.lastName,
      zipCode: address?.zipCode || null,
      city: address?.city,
      phone: address.phone,
      email: address.email,
      departmentNumber: address.departmentNumber,
      floorNumber: address.floorNumber,
      betweenStreets: address?.betweenStreets,
    };
    return addressOrder;
  }

  async buildDeliveryAreaOrder(deliveryArea: any): Promise<DeliveryAreaDto> {
    const deliveryAreaOrder: DeliveryAreaDto = {
      enabled: deliveryArea.enabled,
      coordinates: deliveryArea.coordinates,
      description: deliveryArea.description,
      schedule: deliveryArea.schedule,
      orderCutOffHour: deliveryArea.orderCutOffHour,
      sameDayDelivery: deliveryArea.sameDayDelivery,
      whatsappNumber: deliveryArea.whatsappNumber,
      sameDayDeliveryDays: deliveryArea.sameDayDeliveryDays,
    };
    return deliveryAreaOrder;
  }

  async buildUserORder(user: any): Promise<UserDto> {
    const userOrder: UserDto = {
      email: user.email,
      password: 'hashedPassword',
      name: user.name,
      lastName: user.lastName,
      nationalId: user.nationalId,
      phoneNumber: user.phoneNumber,
      birthDate: user.birthDate,
      role: user.role,
    };
    return userOrder;
  }

  async findAll(paginationDto: PaginationDto) {
    return this.paginationService.paginate(
      this.orderModel,
      paginationDto.page,
      paginationDto.limit,
    );
  }

  async findOne(id: string) {
    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    await this.cacheManager.set(
      `order`,
      order,
      Number(this.configService.get('CACHE_TTL')),
    );

    return order;
  }

  async updateStatus(id: string, updateOrderDto: UpdateStatusDto) {
    const order = await this.orderModel.findById(id);
    if (!OrderStatus[updateOrderDto.status]) {
      throw new BadRequestException('Invalid status');
    }

    if (order.status === OrderStatus[updateOrderDto.status]) {
      throw new BadRequestException('Status already set to this order');
    }

    if (OrderStatus[updateOrderDto.status] === OrderStatus[2]) {
      order.items.forEach(async (item) => {
        await this.productsService.updateSalesCount(item.id, 1);
      });
    }

    order.status = OrderStatus[updateOrderDto.status];
    await order.save();

    if (OrderStatus[updateOrderDto.status] === OrderStatus[5]) {
      const coupon = await this.couponService.findOneByCode(order.coupon);
      coupon.count -= 1;
      await this.couponService.update(order.coupon, coupon);
      await this.sumStock(order.items);
      order.items.forEach(async (item) => {
        await this.productsService.restoreSalesCount(item.id, 1);
      });
    }

    return {
      message: 'Order status updated',
    };
  }

  async getByUserEmail(email: string, paginationDto: PaginationDto) {
    try {
      await this.usersService.findOneByEmail(email);

      const query = { 'user.email': email };
      const { data, pagination } = await this.paginationService.paginate(
        this.orderModel,
        paginationDto.page,
        paginationDto.limit,
        query,
      );

      return { data: data || [], pagination };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error getting orders by user email: ${error.message}`,
      );
    }
  }

  async validateStock(products: any[]) {
    for await (const product of products) {
      await this.productsService.findOneById(product.productId);

      for await (const option of product.options) {
        const optionFromDb = await this.optionsService.findOne(option.id);

        if (option.quantity > optionFromDb.stock) {
          throw new BadRequestException(
            `Not enough stock for option ${optionFromDb.name}`,
          );
        }

        optionFromDb.stock -= option.quantity;
        await this.optionsService.update(option.id, optionFromDb);
      }
    }
  }

  async sumStock(items: any[]) {
    for await (const item of items) {
      for await (const option of item.options) {
        const optionFromDb = await this.optionsService.findOne(option?._id);
        optionFromDb.stock += option.quantity;
        await this.optionsService.update(option?._id, optionFromDb);
      }
    }
  }

  async mpWebhook(query: any) {
    const topic = query.topic || query.type;

    if (topic === 'payment') {
      const paymentId = query.id || query['data.id'];
      const payment = await this.mercadoPagoService.getPayment(paymentId);

      if (payment.status === 'approved') {
        const orderId = payment.external_reference;
        const order = await this.orderModel.findById(orderId);

        // Actualizar el estado de los productos vendidos
        order.items.forEach(async (item) => {
          const product = await this.productsService.findOneById(item.id);
          product.salesCount += 1;

          const newProduct = new ProductDto();
          newProduct.id = product.id;
          newProduct.name = product.name;
          newProduct.description = product.description;
          newProduct.price = product.price;
          newProduct.stock = product.stock;
          newProduct.category = product.category?.id || product.category?._id;
          newProduct.images = product.images;
          newProduct.options = product.options;
          newProduct.salesCount = product.salesCount;

          await this.productsService.update(item.id, newProduct);
        });

        if (order.status !== OrderStatus[2]) {
          await this.mailerService.sendOrderConfirmationEmail(
            order.user.email,
            order,
          );
        }

        // Actualizar el estado de la orden
        order.status = OrderStatus[2];
        await order.save();

        // Actualizar el estado en Google Sheets
        try {
          await this.googleSheetsService.updateOrderStatus(
            orderId,
            'Confirmado',
          );
        } catch (error) {
          console.error(
            `[Google Sheets Error] Failed to update order ${orderId} status:`,
            error.message,
          );
        }

        return true;
      }
    } else {
      return 'OK';
    }
  }

  async validateCoupon(cartDto: CartDto) {
    const coupon = await this.couponService.findOneByCode(cartDto.coupon);

    if (!coupon) {
      throw new NotFoundException('COUPON_NOT_FOUND');
    }

    // Verificar si el usuario ya ha utilizado este cupón
    if (coupon.usedByUsers && coupon.usedByUsers.has(cartDto.userId)) {
      throw new BadRequestException('COUPON_ALREADY_USED');
    }

    if (coupon.applicableProductOption) {
      const isApplicable = cartDto.products.some(
        (product) =>
          product.optionId === coupon.applicableProductOption.toString(),
      );

      if (!isApplicable) {
        throw new BadRequestException(
          'COUPON_NOT_APPLICABLE_TO_PRODUCT_OPTION',
        );
      }
    }

    // Asegúrate de esperar la resolución de la promesa
    const discount = await this.calculateDiscount(coupon, cartDto);

    return {
      isValid: true,
      discount,
      message: 'Coupon is valid',
    };
  }

  private async calculateDiscount(
    coupon: Coupon,
    cartDto: CartDto,
  ): Promise<number> {
    let discount = 0;

    // Obtener los IDs de las opciones de producto en el carrito
    const optionIds = cartDto.products.map((product) => product.optionId);

    // Buscar las opciones de producto en la base de datos
    const options = await this.optionsService.findManyByIds(optionIds);

    if (coupon.type === CouponType.FIXED) {
      if (coupon.applicableProductOption) {
        // Descuento fijo aplicado a una opción específica
        const applicableProduct = cartDto.products.find(
          (product) =>
            product.optionId === coupon.applicableProductOption.toString(),
        );

        if (applicableProduct) {
          const unidadesAplicables = Math.min(
            applicableProduct.quantity,
            coupon.maxAplicableUnits || applicableProduct.quantity, // Aplica hasta la cantidad máxima definida
          );
          discount = coupon.value * unidadesAplicables;
        }
      } else {
        // Descuento fijo aplicado a la orden completa
        discount = coupon.value;
      }
    } else if (coupon.type === CouponType.PERCENTAGE) {
      if (coupon.applicableProductOption) {
        // Descuento porcentual aplicado a una opción específica
        const applicableProduct = cartDto.products.find(
          (product) =>
            product.optionId === coupon.applicableProductOption.toString(),
        );
        if (applicableProduct) {
          const option = options.find(
            (option) =>
              option._id.toString() ===
              coupon.applicableProductOption.toString(),
          );
          if (option) {
            const unidadesAplicables = Math.min(
              applicableProduct.quantity,
              coupon.maxAplicableUnits || applicableProduct.quantity, // Aplica hasta la cantidad máxima definida
            );
            discount =
              ((option.price * coupon.value) / 100) * unidadesAplicables;
          }
        }
      } else {
        // Descuento porcentual aplicado a la orden completa
        const totalOrderValue = options.reduce((sum, option) => {
          const cartProduct = cartDto.products.find(
            (product) => product.optionId === option._id.toString(),
          );
          return sum + option.price * cartProduct.quantity;
        }, 0);
        discount = (totalOrderValue * coupon.value) / 100;
      }
    }

    return discount;
  }

  /**
   * Convierte un deliveryDate (string) a deliveryDay (Date)
   * Usado al crear nuevas órdenes
   */
  private parseDeliveryDateToDay(deliveryDate: string): Date | null {
    if (!deliveryDate || deliveryDate.trim() === '') {
      return null;
    }

    const trimmed = deliveryDate.trim();
    const currentYear = new Date().getFullYear();

    try {
      if (trimmed.includes(' de ')) {
        // Formato "18/09 de 13.30hs a 17hs" -> Date
        const [datePart] = trimmed.split(' de ');
        const [day, month] = datePart.split('/');
        const dateString = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const deliveryDay = new Date(dateString);

        return isNaN(deliveryDay.getTime()) ? null : deliveryDay;
      } else if (trimmed.includes('/')) {
        // Formato solo "28/06" -> Date
        const [day, month] = trimmed.split('/');
        const dateString = `${currentYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        const deliveryDay = new Date(dateString);

        return isNaN(deliveryDay.getTime()) ? null : deliveryDay;
      }
    } catch (error) {
      console.warn(
        `⚠️ Error parseando deliveryDate "${deliveryDate}":`,
        error.message,
      );
    }

    return null;
  }
}
