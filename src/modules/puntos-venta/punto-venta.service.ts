import { Injectable, NotFoundException } from '@nestjs/common';
// import { ObjectId } from 'mongodb';
// import { MongoService } from '../mongo/mongo.service';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Model, isValidObjectId } from 'mongoose';

import {
  PuntoVenta,
} from './interfaces/punto-venta.interface';
import { CreatePuntoVentaDto } from './dto/punto-venta.dto';
import { UpdatePuntoVentaDto } from './dto/update.dto';
import { PuntosVenta } from 'src/schemas/puntos-venta.schema';

@Injectable()
export class PuntosVentaService {

  constructor(
    @InjectModel(PuntosVenta.name) private readonly puntoEnvioModel: Model<PuntosVenta>,
  ) { }



  async findAll(query: any): Promise<any> {
    const {
      pageIndex = 0,
      pageSize = 50,
      search = '',
      zona,
      activo = true,
      sortBy = 'nombre',
      sortDesc = false,
    } = query;

    // const collection = await this.collection();
    const collection = this.puntoEnvioModel;

    const filter: any = { activo };

    if (zona) filter.zona = zona;

    if (search) {
      const flexibleZonaTerm = search.replace(/\s+/g, '[\\s_]');

      filter.$or = [
        { nombre: { $regex: search, $options: 'i' } },
        { 'contacto.telefono': { $regex: search, $options: 'i' } },
        { 'contacto.email': { $regex: search, $options: 'i' } },
        { zona: { $regex: flexibleZonaTerm, $options: 'i' } },
      ];
    }

    const total = await collection.countDocuments(filter);
    const pageCount = Math.ceil(total / pageSize);

    const sortObject: any = {
      [sortBy]: sortDesc ? -1 : 1,
    };

    const data = await collection
      .find(filter)
      .sort(sortObject)
      .skip(pageIndex * pageSize)
      .limit(pageSize)
      .lean();
    return {
      data: data.map(d => ({
        ...d,
        _id: d._id.toString(),
      })),
      total,
      pageCount,
    };
  }

  async findById(id: string): Promise<any> {
    const item = await this.puntoEnvioModel.findById(id).lean();

    if (!item) throw new NotFoundException('Punto de venta no encontrado');

    return {
      ...item,
      _id: item._id.toString(),
    };
  }

  async create(data: CreatePuntoVentaDto) {

    const collection = this.puntoEnvioModel;

    const newItem: PuntoVenta = {
      ...data,
      kilosPorMes: [],
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.puntoEnvioModel.create(newItem);

    return {
      ...created.toObject(),
      _id: created._id.toString(),
    };
  }

  async update(
    id: string,
    data: UpdatePuntoVentaDto,
  ): Promise<any> {
    // REVISAR EL RETORNO DE ESTA FUNCION

    const updated = await this.puntoEnvioModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
            updatedAt: new Date(),
          },
        },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Punto de venta no encontrado');
    }

    return {
      ...updated,
      _id: updated._id.toString(),
    };
  }


  async softDelete(id: string) {
    const collection = this.puntoEnvioModel;

    await collection.updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $set: {
          activo: false,
          updatedAt: new Date(),
        },
      },
    );

    return { success: true };
  }
}
