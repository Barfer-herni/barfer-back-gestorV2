import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { Model } from 'mongoose';

import { PuntoVenta } from './interfaces/punto-venta.interface';
import { CreatePuntoVentaDto } from './dto/punto-venta.dto';
import { UpdatePuntoVentaDto } from './dto/update.dto';
import { PuntosVenta } from '../../schemas/puntos-venta.schema';
import { Order } from '../../schemas/order.schema';
import { Prices } from '../../schemas/prices.schema';

// ---- Tipos internos ----
interface ProductoMayorista {
  fullName: string;
  product: string;
  weight: string;
  kilos: number;
  section: string;
}

export interface PuntoVentaStats {
  _id: string;
  nombre: string;
  zona: string;
  telefono: string;
  kgTotales: number;
  frecuenciaCompra: string;
  promedioKgPorPedido: number;
  kgUltimaCompra: number;
  totalPedidos: number;
  fechaPrimerPedido?: Date;
  fechaUltimoPedido?: Date;
}


//nueva funcionalidad para kilos totales
interface ItemStats {
  bigDogPollo: number;
  bigDogVaca: number;
  huesosCarnosos: number;
  pollo: number;
  vaca: number;
  cerdo: number;
  cordero: number;
  gatoPollo: number;
  gatoVaca: number;
  gatoCordero: number;
  totalPerro: number;
  totalGato: number;
  totalKg: number;
}



// ---- Helper: extrae kilos del nombre del producto ----
function parseWeightFromName(name: string): number {
  const upper = name.toUpperCase().trim();
  const kgMatch = upper.match(/([\d.,]+)\s*KG/);
  if (kgMatch) return parseFloat(kgMatch[1].replace(',', '.'));
  const grMatch = upper.match(/([\d.,]+)\s*GR/);
  if (grMatch) return parseFloat(grMatch[1].replace(',', '.')) / 1000;
  return 1; // fallback: 1 unidad
}

// ---- Helper: clasifica y suma kilos por categoría ----
function clasificarItem(
  productName: string,
  optionName: string,
  totalWeight: number,
  stats: ItemStats,
): void {
  const name = productName.toUpperCase();
  const option = optionName?.toUpperCase() || '';

  if (name.includes('BIG DOG')) {
    if (option.includes('POLLO')) stats.bigDogPollo += totalWeight;
    else if (option.includes('VACA')) stats.bigDogVaca += totalWeight;
    stats.totalPerro += totalWeight;

  } else if (name.includes('HUESOS') || name.includes('CARNOSOS')) {
    stats.huesosCarnosos += totalWeight;

  } else if (name.includes('PERRO')) {
    if (name.includes('POLLO')) stats.pollo += totalWeight;
    else if (name.includes('VACA')) stats.vaca += totalWeight;
    else if (name.includes('CERDO')) stats.cerdo += totalWeight;
    else if (name.includes('CORDERO')) stats.cordero += totalWeight;
    stats.totalPerro += totalWeight;

  } else if (name.includes('GATO')) {
    if (name.includes('POLLO')) stats.gatoPollo += totalWeight;
    else if (name.includes('VACA')) stats.gatoVaca += totalWeight;
    else if (name.includes('CORDERO')) stats.gatoCordero += totalWeight;
    stats.totalGato += totalWeight;
  }

  stats.totalKg += totalWeight;
}

// ---- Helper: calcula kilos totales de una orden ----
function calcularKilosPorOrden(items: any[]): { totalKg: number; detalles: ItemStats } {
  const stats: ItemStats = {
    bigDogPollo: 0, bigDogVaca: 0,
    huesosCarnosos: 0,
    pollo: 0, vaca: 0, cerdo: 0, cordero: 0,
    gatoPollo: 0, gatoVaca: 0, gatoCordero: 0,
    totalPerro: 0, totalGato: 0,
    totalKg: 0,
  };

  if (!items || !Array.isArray(items)) return { totalKg: 0, detalles: stats };

  for (const item of items) {
    const productName = (item.name || item.product || item.id || '').toUpperCase();

    // iterar las opciones porque cada una tiene su propio peso y cantidad
    const options = item.options?.length ? item.options : [{ name: '', quantity: 1 }];

    for (const option of options) {
      const optionName = (option.name || '').toUpperCase();
      const cantidad = option.quantity || 1; // ← cantidad desde la opción

      const pesoUnitario =
        parseWeightFromName(optionName) ||    // "5KG" → 5
        parseWeightFromName(productName) ||   // fallback al nombre
        1;

      const totalWeight = pesoUnitario * cantidad;
      clasificarItem(productName, optionName, totalWeight, stats);
    }
  }

  return { totalKg: stats.totalKg, detalles: stats };
}


// ---- Helpers ----
function parseWeightKilos(weight: string): number {
  if (!weight) return 0;
  const upper = weight.toUpperCase().trim();
  const kgMatch = upper.match(/^([\d.,]+)\s*KG$/);
  if (kgMatch) return parseFloat(kgMatch[1].replace(',', '.'));
  const gMatch = upper.match(/^([\d.,]+)\s*GR?$/);
  if (gMatch) return parseFloat(gMatch[1].replace(',', '.')) / 1000;
  return 0;
}

function calcularKilosItem(
  itemName: string,
  productosMayoristas: ProductoMayorista[],
): number {
  if (!itemName) return 0;
  const nameNorm = itemName.toLowerCase().trim();

  const exactMatch = productosMayoristas.find(
    (p) => p.fullName.toLowerCase() === nameNorm,
  );
  if (exactMatch) return exactMatch.kilos;

  const partialMatch = productosMayoristas.find(
    (p) =>
      nameNorm.includes(p.product.toLowerCase()) &&
      (p.weight === 'UNIDAD' || nameNorm.includes(p.weight.toLowerCase())),
  );
  if (partialMatch) return partialMatch.kilos;

  return 0;
}

// function calcularKilosPorOrden(
//   items: any[],
//   productosMayoristas: ProductoMayorista[],
// ): number {
//   if (!items || !Array.isArray(items)) return 0;
//   return items.reduce((sum, item) => {
//     const name = item.name || item.id || item.product || '';
//     const cantidad = item.quantity || item.cantidad || 1;
//     const kilosUnitario = calcularKilosItem(name, productosMayoristas);
//     return sum + kilosUnitario * cantidad;
//   }, 0);
// }

function calcularFrecuencia(ordenes: any[]): string {
  if (ordenes.length < 2) return 'Sin datos';
  const fechas = ordenes
    .map((o) => new Date(o.createdAt).getTime())
    .sort((a, b) => a - b);
  let diffTotal = 0;
  for (let i = 1; i < fechas.length; i++) {
    diffTotal += fechas[i] - fechas[i - 1];
  }
  const avgDias = Math.round(
    diffTotal / (fechas.length - 1) / (1000 * 60 * 60 * 24),
  );
  if (avgDias <= 7) return 'Semanal';
  if (avgDias <= 14) return 'Quincenal';
  if (avgDias <= 35) return 'Mensual';
  return `Cada ${avgDias} días`;
}

@Injectable()
export class PuntosVentaService {
  constructor(
    @InjectModel(PuntosVenta.name)
    private readonly puntosVentaModel: Model<PuntosVenta>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    @InjectModel(Prices.name)
    private readonly pricesModel: Model<Prices>,
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
      data: data.map((d) => ({
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

  async updatePuntoVenta(id: string, data: UpdatePuntoVentaDto): Promise<any> {
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

  async addKilosMes(id: string, mes: number, anio: number, kilos: number) {
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

    const puntosVenta = await collection
      .find({
        activo: true,
        $or: [
          { nombre: { $regex: searchTerm, $options: 'i' } },
          { 'contacto.telefono': { $regex: searchTerm, $options: 'i' } },
          { 'contacto.direccion': { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .limit(10)
      .lean();

    return puntosVenta.map((pv) => ({
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

  /**
   * Estadísticas por punto de venta cruzando órdenes mayoristas con el catálogo de precios
   */
  async getPuntosVentaStats(
    from?: string,
    to?: string,
  ): Promise<{ success: boolean; stats?: PuntoVentaStats[]; error?: string }> {
    try {
      // 1. Cargar catálogo de productos mayoristas activos
      const pricesDocs = await this.pricesModel
        .find({ priceType: 'MAYORISTA', isActive: true })
        .lean();

      const productosMayoristasMap = new Map<string, ProductoMayorista>();
      for (const doc of pricesDocs) {
        const weight = doc.weight || '';
        const fullName = weight
          ? `${doc.product} ${weight}`.trim()
          : doc.product;
        const kilos = parseWeightKilos(weight);
        const kilosFinales = kilos > 0 ? kilos : 1;
        const section = (doc as any).section || 'OTROS';

        if (!productosMayoristasMap.has(fullName)) {
          productosMayoristasMap.set(fullName, {
            fullName,
            product: doc.product,
            weight: weight || 'UNIDAD',
            kilos: kilosFinales,
            section,
          });
        }
      }
      const productosMayoristas = Array.from(productosMayoristasMap.values());

      // 2. Obtener puntos de venta activos
      const puntosVenta = await this.puntosVentaModel
        .find({ activo: true })
        .lean();

      const statsArray: PuntoVentaStats[] = [];

      for (const puntoVenta of puntosVenta) {
        const puntoVentaId = puntoVenta._id.toString();

        // Construir filtro de órdenes
        const orderFilter: any = {
          orderType: 'mayorista',
          punto_de_venta: puntoVentaId,
        };

        if (from || to) {
          orderFilter.createdAt = {};
          if (from) {
            const startDate = new Date(from);
            startDate.setHours(0, 0, 0, 0);
            orderFilter.createdAt.$gte = startDate;
          }
          if (to) {
            const endDate = new Date(to);
            endDate.setHours(23, 59, 59, 999);
            orderFilter.createdAt.$lte = endDate;
          }
        }

        const ordenes = (await this.orderModel
          .find(orderFilter)
          .sort({ createdAt: 1 })
          .lean()) as any[];

        if (ordenes.length === 0) {
          statsArray.push({
            _id: puntoVentaId,
            nombre: puntoVenta.nombre,
            zona: puntoVenta.zona,
            telefono: (puntoVenta as any).contacto?.telefono || 'Sin teléfono',
            kgTotales: 0,
            frecuenciaCompra: 'Sin pedidos',
            promedioKgPorPedido: 0,
            kgUltimaCompra: 0,
            totalPedidos: 0,
          });
          continue;
        }

        let kgTotales = 0;
        for (const orden of ordenes) {
          // const kilos = calcularKilosPorOrden(
          //   (orden as any).items || [],
          //   productosMayoristas,
          // );
          // kgTotales += kilos;
          const { totalKg } = calcularKilosPorOrden(orden.items || []);
          kgTotales += totalKg;
        }

        const promedioKg = kgTotales / ordenes.length;
        const ultimaOrden = ordenes[ordenes.length - 1];
        // const kgUltimaCompra = calcularKilosPorOrden(
        //   (ultimaOrden as any).items || [],
        //   productosMayoristas,
        // );
        const { totalKg: kgUltimaCompra } = calcularKilosPorOrden(ultimaOrden.items || []);

        const frecuencia = calcularFrecuencia(ordenes);
        const primerPedido = new Date((ordenes[0] as any).createdAt);
        const ultimoPedido = new Date((ultimaOrden as any).createdAt);

        statsArray.push({
          _id: puntoVentaId,
          nombre: puntoVenta.nombre,
          zona: puntoVenta.zona,
          telefono: (puntoVenta as any).contacto?.telefono || 'Sin teléfono',
          kgTotales: Math.round(kgTotales),
          frecuenciaCompra: frecuencia,
          promedioKgPorPedido: Math.round(promedioKg),
          kgUltimaCompra: Math.round(kgUltimaCompra),
          totalPedidos: ordenes.length,
          fechaPrimerPedido: primerPedido,
          fechaUltimoPedido: ultimoPedido,
        });
      }

      // Ordenar por kgTotales descendente
      statsArray.sort((a, b) => b.kgTotales - a.kgTotales);

      return { success: true, stats: statsArray };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }
}
