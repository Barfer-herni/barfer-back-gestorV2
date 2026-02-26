import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SalidasService } from './salidas.service';
import { SalidasController } from './salidas.controller';
import { Salidas, SalidasSchema } from '../../schemas/salidas.schema';
import { Proveedores, ProveedoresSchema } from '../../schemas/proveedores.schema';
import { CategoriaGestor, CategoriaGestorSchema } from '../../schemas/categorias-gestor.schema';
import { PaymentsGestor, PaymentsGestorSchema } from '../../schemas/payments-gestor.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Salidas.name, schema: SalidasSchema },
            { name: Proveedores.name, schema: ProveedoresSchema },
            { name: CategoriaGestor.name, schema: CategoriaGestorSchema },
            { name: PaymentsGestor.name, schema: PaymentsGestorSchema },
        ]),
    ],
    controllers: [SalidasController],
    providers: [SalidasService],
    exports: [SalidasService],
})
export class SalidasModule { }
