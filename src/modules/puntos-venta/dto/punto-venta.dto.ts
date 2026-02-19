import {
  PuntoVentaZona,
  PuntoVentaFrecuencia,
  PuntoVentaTipoNegocio,
} from '../interfaces/punto-venta.interface';

export class CreatePuntoVentaDto {
  nombre: string;
  zona: PuntoVentaZona;
  frecuencia: PuntoVentaFrecuencia;
  fechaInicioVentas: Date | string;
  fechaPrimerPedido?: Date | string;
  fechaUltimoPedido?: Date | string;
  tieneFreezer: boolean;
  cantidadFreezers?: number;
  capacidadFreezer?: number;
  tiposNegocio: PuntoVentaTipoNegocio[];
  horarios?: string;
  contacto?: {
    telefono?: string;
    email?: string;
    direccion?: string;
  };
  notas?: string;
}
