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
import { PuntosVenta } from '../../schemas/puntos-venta.schema';

@Injectable()
export class PuntosVentaService {

  constructor(
    @InjectModel(PuntosVenta.name) private readonly puntosVentaModel: Model<PuntosVenta>,
  ) { }



  async getPuntosVenta(query: any): Promise<any> {
    const {
      pageIndex = 0,
      pageSize = 50,
      search = '',
      zona,
      activo = true,
      sortBy = 'nombre',
      sortDesc = false,
    } = query;
    const collection = this.puntosVentaModel;

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

  async getPuntoVentaById(id: string): Promise<any> {
    const item = await this.puntosVentaModel.findById(id).lean();

    if (!item) throw new NotFoundException('Punto de venta no encontrado');

    return {
      ...item,
      _id: item._id.toString(),
    };
  }

  async createPuntoVenta(data: CreatePuntoVentaDto) {
    const newItem: PuntoVenta = {
      ...data,
      kilosPorMes: [],
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await this.puntosVentaModel.create(newItem);

    return {
      ...created.toObject(),
      _id: created._id.toString(),
    };
  }

  async updatePuntoVenta(
    id: string,
    data: UpdatePuntoVentaDto,
  ): Promise<any> {
    const updated = await this.puntosVentaModel
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


  async deletePuntoVenta(id: string) {
    const collection = this.puntosVentaModel;

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


  async addKilosMes(
    id: string,
    mes: number,
    anio: number,
    kilos: number
  ) {
    const collection = this.puntosVentaModel;

    await collection.updateOne(
      { _id: new Types.ObjectId(id) },
      {
        $push: {
          kilosPorMes: { mes, anio, kilos },
        },
        $set: {
          updatedAt: new Date(),
        },
      },
    );

    return { success: true };
  }


  async searchPuntosVenta(searchTerm: string): Promise<any[]> {
    const collection = this.puntosVentaModel;

    const puntosVenta = await collection.find({
      activo: true,
      $or: [
        { nombre: { $regex: searchTerm, $options: 'i' } },
        { 'contacto.telefono': { $regex: searchTerm, $options: 'i' } },
        { 'contacto.direccion': { $regex: searchTerm, $options: 'i' } },
      ],
    }).limit(10).lean();

    return puntosVenta.map(pv => ({
      ...pv,
      _id: pv._id.toString(),
    }));
  }



  async getVentasPorZona() {
    const collection = this.puntosVentaModel;

    const ventasPorZona = await collection.aggregate([
      {
        $group: {
          _id: '$zona',
          total: { $sum: '$kilosPorMes.kilos' },
        },
      },
    ]);

    return ventasPorZona;
  }

}

