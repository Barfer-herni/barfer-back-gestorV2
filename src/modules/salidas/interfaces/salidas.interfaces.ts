export interface SalidaData {
    _id: string;
    fechaFactura: Date | string;
    detalle: string;
    tipo: 'ORDINARIO' | 'EXTRAORDINARIO';
    marca?: string | null;
    monto: number;
    tipoRegistro: 'BLANCO' | 'NEGRO';
    categoriaId: string;
    metodoPagoId: string;
    proveedorId?: string | null;
    fechaPago?: Date | string | null;
    comprobanteNumber?: string | null;
    categoria?: {
        _id: string;
        nombre: string;
    };
    metodoPago?: {
        _id: string;
        nombre: string;
    };
    proveedor?: {
        _id: string;
        nombre: string;
        detalle: string;
        telefono: string;
        personaContacto: string;
        registro: 'BLANCO' | 'NEGRO';
    } | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface SalidasFilters {
    searchTerm?: string;
    categoriaId?: string;
    marca?: string;
    metodoPagoId?: string;
    tipo?: 'ORDINARIO' | 'EXTRAORDINARIO';
    tipoRegistro?: 'BLANCO' | 'NEGRO';
    fecha?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
}
