import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prices, Section, PriceType } from '../../schemas/prices.schema';
import { TemplatePricesProducts } from '../../schemas/template_prices_products.schema';
import { PriceDto } from './dto/price.dto';
import { UpdatePriceDto } from './dto/update.dto';
import { PriceHistory, PriceHistoryQuery, PriceStats } from './interfaces/prices.interfaces';
import { TemplatePricesProductsService } from '../template_prices_products/template_prices_products.service';

@Injectable()
export class PricesService {
  constructor(
    @InjectModel(Prices.name) private readonly pricesModel: Model<Prices>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly templatePricesProductsService: TemplatePricesProductsService,
  ) { }

  /**
   * Obtener todos los precios activos
   */
  async getAllPrices() {
    try {
      const prices = await this.pricesModel.find(
        { isActive: true },
        null,
        {
          sort: {
            section: 1,
            product: 1,
            weight: 1,
            priceType: 1,
            validFrom: -1,
            effectiveDate: -1
          }
        }
      ).exec();

      return {
        success: true,
        prices,
        total: prices.length
      };
    } catch (error) {
      console.error('Error getting prices:', error);
      return {
        success: false,
        message: 'Error al obtener los precios',
        error: 'GET_PRICES_ERROR',
        prices: [],
        total: 0
      };
    }
  }

  /**
   * Obtener precios por filtros específicos (incluye historial)
   */
  async getPrices(query: PriceHistoryQuery) {
    try {
      const filter: any = {};

      if (query.section) filter.section = query.section;
      if (query.product) filter.product = query.product;
      if (query.weight !== undefined) filter.weight = query.weight;
      if (query.priceType) filter.priceType = query.priceType;
      if (query.isActive !== undefined) filter.isActive = query.isActive;
      if (query.month) filter.month = query.month;
      if (query.year) filter.year = query.year;
      if (query.effectiveDate) filter.effectiveDate = query.effectiveDate;
      const prices = await this.pricesModel.find(filter, null, {
        sort: {
          section: 1,
          product: 1,
          weight: 1,
          priceType: 1,
          validFrom: -1,
          effectiveDate: -1
        }
      }).exec();

      return {
        success: true,
        prices,
        total: prices.length
      };
    } catch (error) {
      console.error('Error getting filtered prices:', error);
      return {
        success: false,
        message: 'Error al obtener los precios filtrados',
        error: 'GET_FILTERED_PRICES_ERROR',
        prices: [],
        total: 0
      };
    }
  }

  /**
   * Obtener historial de precios para un producto específico
   */
  async getPriceHistory(
    section: Section,
    product: string,
    weight: string | undefined,
    priceType: PriceType
  ): Promise<{ success: boolean; history?: PriceHistory; message?: string; error?: string }> {
    try {
      const filter: any = {
        section,
        product,
        priceType
      };

      if (weight !== undefined) {
        filter.weight = weight;
      }

      const prices = await this.pricesModel.find(filter, null, {
        sort: { validFrom: -1, effectiveDate: -1 }
      }).exec();

      const history: PriceHistory = {
        product,
        section,
        weight,
        priceType,
        history: prices.map((price) => ({
          price: price.price,
          effectiveDate: price.effectiveDate,
          month: price.month,
          year: price.year,
          createdAt: price.createdAt
        }))
      };

      return {
        success: true,
        history
      };
    } catch (error) {
      console.error('Error getting price history:', error);
      return {
        success: false,
        message: 'Error al obtener el historial de precios',
        error: 'GET_PRICE_HISTORY_ERROR'
      };
    }
  }

  /**
   * Crear un nuevo precio
   */
  async createPrice(data: PriceDto) {
    try {
      const effectiveDate = data.effectiveDate || new Date().toISOString().split('T')[0];
      const effectiveDateObj = new Date(effectiveDate);
      const now = new Date().toISOString();

      const newPrice = new this.pricesModel({
        ...data,
        effectiveDate,
        validFrom: data.validFrom || new Date(),
        isActive: data.isActive ?? true,
        month: effectiveDateObj.getUTCMonth() + 1,
        year: effectiveDateObj.getUTCFullYear(),
        createdAt: now,
        updatedAt: now,
      });

      await newPrice.save();

      // Update template logic
      const templateResult = await this.templatePricesProductsService.findAll();
      const existingTemplate = templateResult.success
        ? templateResult.template.find(t =>
          (t.section as any) === (data.section as any) &&
          t.product === data.product &&
          (t.weight === (data.weight || null))
        )
        : null;

      if (existingTemplate) {
        if (!existingTemplate.priceTypes.includes(data.priceType as any)) {
          const newPriceTypes = [...existingTemplate.priceTypes, data.priceType as any];
          await this.templatePricesProductsService.updatePriceTypes(
            data.section,
            data.product,
            data.weight,
            newPriceTypes
          );
        }
      } else {
        await this.templatePricesProductsService.addProduct(
          data.section as any,
          data.product,
          data.weight,
          [data.priceType as any]
        );
      }

      await this.cacheManager.reset();

      return {
        success: true,
        price: newPrice,
        message: 'Precio creado exitosamente'
      };
    } catch (error) {
      console.error('Error creating price:', error);
      return {
        success: false,
        message: 'Error al crear el precio',
        error: 'CREATE_PRICE_ERROR'
      };
    }
  }

  /**
   * Actualizar un precio existente
   */
  async updatePrice(priceId: string, data: UpdatePriceDto) {
    try {
      const existingPrice = await this.pricesModel.findById(priceId);

      if (!existingPrice) {
        return {
          success: false,
          message: 'Precio no encontrado',
          error: 'PRICE_NOT_FOUND'
        };
      }

      const updatedPrice = await this.pricesModel.findByIdAndUpdate(
        priceId,
        {
          $set: {
            ...data,
            updatedAt: new Date().toISOString()
          }
        },
        { new: true }
      );

      await this.cacheManager.reset();

      return {
        success: true,
        price: updatedPrice,
        message: 'Precio actualizado exitosamente'
      };
    } catch (error) {
      console.error('Error updating price:', error);
      return {
        success: false,
        message: 'Error al actualizar el precio',
        error: 'UPDATE_PRICE_ERROR'
      };
    }
  }

  /**
   * Eliminar un precio por ID
   */
  async deletePrice(priceId: string) {
    try {
      const result = await this.pricesModel.deleteOne({ _id: priceId });

      if (result.deletedCount === 0) {
        return {
          success: false,
          message: 'Precio no encontrado',
          error: 'PRICE_NOT_FOUND'
        };
      }

      await this.cacheManager.reset();

      return {
        success: true,
        message: 'Precio eliminado exitosamente'
      };
    } catch (error) {
      console.error('Error deleting price:', error);
      return {
        success: false,
        message: 'Error al eliminar el precio',
        error: 'DELETE_PRICE_ERROR'
      };
    }
  }

  /**
   * Obtener todos los productos únicos con sus metadatos
   */
  async getAllUniqueProducts() {
    try {
      const pipeline = [
        {
          $group: {
            _id: {
              section: "$section",
              product: "$product",
              weight: "$weight"
            },
            priceTypes: { $addToSet: "$priceType" },
            totalPrices: { $sum: 1 },
            isActive: { $max: { $cond: ["$isActive", 1, 0] } }
          }
        },
        {
          $project: {
            section: "$_id.section",
            product: "$_id.product",
            weight: "$_id.weight",
            priceTypes: 1,
            totalPrices: 1,
            isActive: { $eq: ["$isActive", 1] }
          }
        },
        {
          $sort: {
            section: 1,
            product: 1,
            weight: 1
          }
        } as any
      ];

      const products = await this.pricesModel.aggregate(pipeline).exec();

      return {
        success: true,
        products
      };
    } catch (error) {
      console.error('Error getting unique products:', error);
      return {
        success: false,
        message: 'Error al obtener los productos únicos',
        error: 'GET_UNIQUE_PRODUCTS_ERROR',
        products: []
      };
    }
  }

  /**
   * Obtener productos únicos formateados para select de items
   */
  async getProductsForSelect() {
    try {
      const pipeline = [
        {
          $match: {
            isActive: true,
            month: new Date().getUTCMonth() + 1,
            year: new Date().getUTCFullYear()
          }
        },
        {
          $sort: { effectiveDate: -1, createdAt: -1 }
        },
        {
          $group: {
            _id: {
              section: { $toUpper: "$section" },
              product: { $toUpper: "$product" },
              weight: { $toUpper: "$weight" }
            },
            latestPrice: { $first: "$$ROOT" }
          }
        },
        {
          $replaceRoot: { newRoot: "$latestPrice" }
        },
        {
          $project: {
            section: { $toUpper: "$section" },
            product: { $toUpper: "$product" },
            weight: { $cond: [{ $eq: ["$weight", null] }, null, { $toUpper: "$weight" }] }
          }
        },
        {
          $sort: { section: 1, product: 1, weight: 1 }
        } as any
      ];

      const products = await this.pricesModel.aggregate(pipeline).exec();

      const productsWithDetails = products.map(p => {
        const parts = [p.section, p.product];
        if (p.weight) parts.push(p.weight);
        const formattedName = parts.join(' - ');

        return {
          section: p.section,
          product: p.product,
          weight: p.weight,
          formattedName
        };
      });

      const uniqueProducts = [...new Set(productsWithDetails.map(p => p.formattedName))];

      return {
        success: true,
        products: uniqueProducts,
        productsWithDetails
      };
    } catch (error) {
      console.error('Error getting products for select:', error);
      return {
        success: false,
        message: 'Error al obtener los productos para el select',
        products: [],
        productsWithDetails: []
      };
    }
  }

  /**
   * Eliminar todos los precios de un producto específico
   */
  async deleteProductPrices(section: Section, product: string, weight: string | null) {
    try {
      const filter: any = { section, product };
      if (weight !== null) {
        filter.weight = weight;
      } else {
        filter.$or = [{ weight: null }, { weight: { $exists: false } }];
      }
      const result = await this.pricesModel.deleteMany(filter);
      await this.templatePricesProductsService.removeProduct(section as any, product, weight === null ? undefined : weight);
      await this.cacheManager.reset();

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Se eliminaron ${result.deletedCount} precios del producto ${product}`
      };
    } catch (error) {
      console.error('Error deleting product prices:', error);
      return {
        success: false,
        message: 'Error al eliminar los precios del producto',
        deletedCount: 0
      };
    }
  }

  /**
   * Actualizar todos los precios de un producto específico
   */
  async updateProductPrices(
    oldSection: Section,
    oldProduct: string,
    oldWeight: string | null,
    newData: { section?: Section; product?: string; weight?: string | null }
  ) {
    try {
      const filter: any = { section: oldSection, product: oldProduct };
      if (oldWeight !== null) {
        filter.weight = oldWeight;
      } else {
        filter.$or = [{ weight: null }, { weight: { $exists: false } }];
      }

      const updateData: any = { updatedAt: new Date().toISOString() };
      if (newData.section) updateData.section = newData.section;
      if (newData.product) updateData.product = newData.product;

      let updateOperation: any = { $set: updateData };
      if (newData.weight !== undefined) {
        if (newData.weight === null) {
          updateOperation.$unset = { weight: "" };
        } else {
          updateData.weight = newData.weight;
        }
      }

      const result = await this.pricesModel.updateMany(filter, updateOperation);
      await this.cacheManager.reset();

      //editar tambien en el template
      await this.templatePricesProductsService.updateProduct(oldSection, oldProduct, oldWeight, newData);



      return {
        success: true,
        updatedCount: result.modifiedCount,
        message: `Se actualizaron ${result.modifiedCount} precios del producto`
      };
    } catch (error) {
      console.error('Error updating product prices:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Actualizar tipos de precio de un producto
   */
  async updateProductPriceTypes(
    section: Section,
    product: string,
    weight: string | null,
    oldPriceTypes: PriceType[],
    newPriceTypes: PriceType[]
  ) {
    try {
      const filter: any = { section, product };
      if (weight !== null) filter.weight = weight;
      else filter.$or = [{ weight: null }, { weight: { $exists: false } }];

      const typesToAdd = newPriceTypes.filter(type => !oldPriceTypes.includes(type));
      const typesToRemove = newPriceTypes.length > 0
        ? oldPriceTypes.filter(type => !newPriceTypes.includes(type))
        : [];

      let addedCount = 0;
      let removedCount = 0;

      if (typesToRemove.length > 0) {
        const removeResult = await this.pricesModel.deleteMany({ ...filter, priceType: { $in: typesToRemove } });
        removedCount = removeResult.deletedCount;
      }

      if (typesToAdd.length > 0) {
        const now = new Date();
        const curDateStr = now.toISOString().split('T')[0];
        const newPrices = typesToAdd.map(type => ({
          section,
          product,
          weight: weight || null,
          priceType: type,
          price: 0,
          isActive: true,
          effectiveDate: curDateStr,
          month: now.getUTCMonth() + 1,
          year: now.getUTCFullYear(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        }));
        const insertResult = await this.pricesModel.insertMany(newPrices);
        addedCount = insertResult.length;
      }

      await this.templatePricesProductsService.updatePriceTypes(section as any, product, weight || undefined, newPriceTypes as any);
      await this.cacheManager.reset();

      return { success: true, addedCount, removedCount };
    } catch (error) {
      console.error('Error updating product price types:', error);
      return { success: false, addedCount: 0, removedCount: 0 };
    }
  }

  /**
   * Obtener precios actuales
   */
  async getCurrentPrices() {
    try {
      const pipeline = [
        {
          $match: {
            isActive: true,
            effectiveDate: { $lte: new Date().toISOString().split('T')[0] }
          }
        },
        { $sort: { validFrom: -1, effectiveDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: { section: "$section", product: "$product", weight: "$weight", priceType: "$priceType" },
            latestPrice: { $first: "$$ROOT" }
          }
        },
        { $replaceRoot: { newRoot: "$latestPrice" } },
        { $sort: { section: 1, product: 1, weight: 1, priceType: 1 } } as any
      ];

      const prices = await this.pricesModel.aggregate(pipeline).exec();
      return { success: true, prices, total: prices.length };
    } catch (error) {
      console.error('Error getting current prices:', error);
      return { success: false, prices: [], total: 0 };
    }
  }

  /**
   * Obtener estadísticas
   */
  async getPriceStats(): Promise<{ success: boolean; stats?: PriceStats; message?: string }> {
    try {
      const [
        totalPrices,
        pricesBySection,
        pricesByType,
        avgBySection,
        thisMonthChanges,
        recentChanges
      ] = await Promise.all([
        this.pricesModel.countDocuments({ isActive: true }),
        this.pricesModel.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$section", count: { $sum: 1 } } }]),
        this.pricesModel.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$priceType", count: { $sum: 1 } } }]),
        this.pricesModel.aggregate([{ $match: { isActive: true } }, { $group: { _id: "$section", avgPrice: { $avg: "$price" } } }]),
        this.pricesModel.countDocuments({ month: new Date().getUTCMonth() + 1, year: new Date().getUTCFullYear() }),
        this.pricesModel.find().sort({ createdAt: -1 }).limit(10).exec()
      ]);

      const stats: PriceStats = {
        totalPrices,
        pricesBySection: pricesBySection.reduce((acc, i) => ({ ...acc, [i._id]: i.count }), {}),
        pricesByType: pricesByType.reduce((acc, i) => ({ ...acc, [i._id]: i.count }), {}),
        averagePriceBySection: avgBySection.reduce((acc, i) => ({ ...acc, [i._id]: Math.round(i.avgPrice * 100) / 100 }), {}),
        priceChangesThisMonth: thisMonthChanges,
        mostRecentChanges: recentChanges
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Error getting price stats:', error);
      return { success: false };
    }
  }

  // --- Initialization ---

  async initializePricesForPeriod(month: number, year: number) {
    try {
      const existingCount = await this.pricesModel.countDocuments({ month, year });
      if (existingCount > 0) return { success: true, message: 'Ya existen precios', created: 0 };

      const templateResult = await this.templatePricesProductsService.findAll();
      if (!templateResult.success || templateResult.template.length === 0) return { success: false, created: 0 };

      const now = new Date().toISOString();
      const effectiveDate = `${year}-${month.toString().padStart(2, '0')}-01`;

      const pricesToCreate = templateResult.template.flatMap(item =>
        item.priceTypes.map(priceType => ({
          section: item.section,
          product: item.product,
          weight: item.weight,
          priceType,
          price: 0,
          isActive: true,
          effectiveDate,
          month,
          year,
          createdAt: now,
          updatedAt: now
        }))
      );

      const result = await this.pricesModel.insertMany(pricesToCreate);
      await this.cacheManager.reset();
      return { success: true, created: result.length };
    } catch (error) {
      console.error('Error initializing period:', error);
      return { success: false };
    }
  }
}
