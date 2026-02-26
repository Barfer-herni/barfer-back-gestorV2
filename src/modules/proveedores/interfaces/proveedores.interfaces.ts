export interface ProveedorData {
    _id: string;
    nombre: string;
    detalle: string;
    telefono: string;
    personaContacto: string;
    registro: 'BLANCO' | 'NEGRO';
    categoriaId?: string | null;
    metodoPagoId?: string | null;
    categoria?: {
        _id: string;
        nombre: string;
    };
    metodoPago?: {
        _id: string;
        nombre: string;
    };
    isActive: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}
