import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProveedoresService } from './proveedores.service';
import { ProveedoresController } from './proveedores.controller';
import { Proveedores, ProveedoresSchema } from '../../schemas/proveedores.schema';
import { CategoriaGestor, CategoriaGestorSchema } from '../../schemas/categorias-gestor.schema';
import { PaymentsGestor, PaymentsGestorSchema } from '../../schemas/payments-gestor.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Proveedores.name, schema: ProveedoresSchema },
            { name: CategoriaGestor.name, schema: CategoriaGestorSchema },
            { name: PaymentsGestor.name, schema: PaymentsGestorSchema },
        ]),
    ],
    controllers: [ProveedoresController],
    providers: [ProveedoresService],
    exports: [ProveedoresService],
})
export class ProveedoresModule { }
