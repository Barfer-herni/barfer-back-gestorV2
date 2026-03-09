import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Prices, Section, PriceType } from '../../schemas/prices.schema';
import { TemplatePricesProducts } from '../../schemas/template_prices_products.schema';


@Injectable()
export class TemplatePricesProductsService {
    constructor(
        @InjectModel(TemplatePricesProducts.name) private readonly templateModel: Model<TemplatePricesProducts>,
    ) { }

    async findAll() {
        try {
            const template = await this.templateModel.find().exec();
            return { success: true, template };
        } catch (error) {
            console.error('Error getting template:', error);
            return { success: false, template: [] };
        }
    }

    async addProduct(section: any, product: string, weight: string | undefined, priceTypes: any[]) {
        try {
            const existing = await this.templateModel.findOne({ section, product, weight: weight || null });
            if (existing) return { success: true, message: 'Ya existe' };

            const now = new Date().toISOString();
            await new this.templateModel({ section, product, weight: weight || null, priceTypes, createdAt: now, updatedAt: now }).save();
            return { success: true };
        } catch (error) {
            console.error('Error adding to template:', error);
            return { success: false };
        }
    }

    async updatePriceTypes(section: any, product: string, weight: string | undefined, priceTypes: any[]) {
        try {
            const filter = { section, product, weight: weight || null };
            const result = await this.templateModel.updateOne(filter, { $set: { priceTypes, updatedAt: new Date().toISOString() } });
            if (result.matchedCount === 0) return await this.addProduct(section, product, weight, priceTypes);
            return { success: true };
        } catch (error) {
            console.error('Error updating template price types:', error);
            return { success: false };
        }
    }

    async removeProduct(section: any, product: string, weight: string | undefined) {
        try {
            await this.templateModel.deleteOne({ section, product, weight: weight || null });
            return { success: true };
        } catch (error) {
            console.error('Error removing from template:', error);
            return { success: false };
        }
    }

    async updateProduct(
        oldSection: Section,
        oldProduct: string,
        oldWeight: string | null,
        newData: { section?: Section; product?: string; weight?: string | null }
    ) {
        try {
            const filter: any = { section: oldSection, product: oldProduct, weight: oldWeight || null };
            const updateData: any = { updatedAt: new Date().toISOString() };

            if (newData.section) updateData.section = newData.section;
            if (newData.product) updateData.product = newData.product;
            if (newData.weight !== undefined) updateData.weight = newData.weight || null;

            await this.templateModel.updateOne(filter, { $set: updateData });
            return { success: true };
        } catch (error) {
            console.error('Error updating template product:', error);
            return { success: false };
        }
    }
}
