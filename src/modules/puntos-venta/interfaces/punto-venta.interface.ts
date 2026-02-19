export type PuntoVentaZona =
    | 'CABA'
    | 'LA_PLATA'
    | 'OESTE'
    | 'NOROESTE'
    | 'NORTE'
    | 'SUR';

export type PuntoVentaFrecuencia =
    | 'SEMANAL'
    | 'QUINCENAL'
    | 'MENSUAL'
    | 'OCASIONAL';

export type PuntoVentaTipoNegocio =
    | 'PET_SHOP'
    | 'VETERINARIA'
    | 'PELUQUERIA';

export interface PuntoVenta {
    _id?: string;
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
    kilosPorMes: Array<{
        mes: number;
        anio: number;
        kilos: number;
    }>;
    contacto?: {
        telefono?: string;
        email?: string;
        direccion?: string;
    };
    notas?: string;
    activo: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
