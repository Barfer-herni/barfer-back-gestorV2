import {
    Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Mayoristas } from '../../schemas/mayoristas.schema';
import { AddressService } from '../address/address.service';
import { DeliveryAreasService } from '../delivery-areas/delivery-areas.service';
import { OptionsService } from '../options/options.service';
import { ProductsService } from '../products/products.service';
import { UsersService } from '../users/users.service';
import { CreateMayoristaDto } from './dto/create-mayorista.dto';
import { UpdateMayoristaDto } from './dto/update-mayorista.dto';

@Injectable()
export class MayoristasService {
    constructor(
        @InjectModel(Mayoristas.name) private readonly mayoristasModel: Model<Mayoristas>,
        private readonly usersService: UsersService,
        private readonly productsService: ProductsService,
        private readonly addressService: AddressService,
        private readonly deliveryAreaService: DeliveryAreasService,
        private readonly configService: ConfigService,
        private readonly optionsService: OptionsService,
    ) { }

    async createMayoristaPerson(data: CreateMayoristaDto): Promise<{ success: boolean; mayorista?: Mayoristas; isNew?: boolean; error?: string }> {
        try {
            const { user } = data;
            const existingMayorista = await this.mayoristasModel.findOne({
                'user.name': user.name,
                'user.lastName': user.lastName
            }).exec();

            if (existingMayorista) {
                return {
                    success: true,
                    mayorista: existingMayorista,
                    isNew: false
                };
            }
            const newMayorista = new this.mayoristasModel({
                ...data,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            const savedMayorista = await newMayorista.save();
            return {
                success: true,
                mayorista: savedMayorista,
                isNew: true
            };
        } catch (error) {
            console.error('Error in createMayoristaPerson:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async getMayoristaPersons(): Promise<{ success: boolean; mayoristas?: Mayoristas[]; error?: string }> {
        try {
            const mayoristas = await this.mayoristasModel.find().exec();
            return { success: true, mayoristas };
        } catch (error) {
            console.error('Error in getMayoristaPersons:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async getMayoristaPersonById(id: string): Promise<{ success: boolean; mayorista?: Mayoristas; error?: string }> {
        try {
            const mayorista = await this.mayoristasModel.findById(id).exec();
            if (!mayorista) {
                return { success: false, error: 'Mayorista person not found' };
            }
            return { success: true, mayorista };
        } catch (error) {
            console.error('Error in getMayoristaPersonById:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async findMayoristaByName(name: string, lastName: string): Promise<{ success: boolean; mayorista?: Mayoristas; error?: string }> {
        try {
            const mayorista = await this.mayoristasModel.findOne({
                'user.name': name,
                'user.lastName': lastName
            }).exec();

            if (!mayorista) {
                return { success: false, error: 'Mayorista not found' };
            }

            return { success: true, mayorista };
        } catch (error) {
            console.error('Error in findMayoristaByName:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async updateMayoristaPerson(id: string, data: UpdateMayoristaDto): Promise<{ success: boolean; mayorista?: Mayoristas; error?: string }> {
        try {
            const updateData = {
                ...data,
                updatedAt: new Date().toISOString(),
            };

            const updatedMayorista = await this.mayoristasModel.findByIdAndUpdate(
                id,
                { $set: updateData },
                { new: true }
            ).exec();

            if (!updatedMayorista) {
                return { success: false, error: 'Mayorista person not found' };
            }

            return { success: true, mayorista: updatedMayorista };
        } catch (error) {
            console.error('Error in updateMayoristaPerson:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async deleteMayoristaPerson(id: string): Promise<{ success: boolean; error?: string }> {
        try {
            const result = await this.mayoristasModel.findByIdAndDelete(id).exec();
            if (!result) {
                return { success: false, error: 'Mayorista person not found' };
            }
            return { success: true };
        } catch (error) {
            console.error('Error in deleteMayoristaPerson:', error);
            return { success: false, error: 'Internal server error' };
        }
    }

    async searchMayoristas(searchTerm: string): Promise<{ success: boolean; mayoristas?: Mayoristas[]; error?: string }> {
        try {
            if (!searchTerm || searchTerm.length < 2) {
                return { success: true, mayoristas: [] };
            }
            const mayoristas = await this.mayoristasModel.find({
                $or: [
                    { 'user.name': { $regex: searchTerm, $options: 'i' } },
                    { 'user.lastName': { $regex: searchTerm, $options: 'i' } },
                    { 'user.email': { $regex: searchTerm, $options: 'i' } },
                    { 'address.phone': { $regex: searchTerm, $options: 'i' } }
                ]
            }).limit(10).exec();
            return { success: true, mayoristas };
        } catch (error) {
            console.error('Error in searchMayoristas:', error);
            return { success: false, error: 'Internal server error' };
        }
    }
}

