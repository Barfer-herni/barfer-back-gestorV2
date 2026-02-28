import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriasGestorService } from './categorias-gestor.service';
import { CategoriasGestorController } from './categorias-gestor.controller';
import { CategoriaGestor, CategoriaGestorSchema } from '../../schemas/categorias-gestor.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: CategoriaGestor.name, schema: CategoriaGestorSchema },
        ]),
    ],
    controllers: [CategoriasGestorController],
    providers: [CategoriasGestorService],
    exports: [CategoriasGestorService],
})
export class CategoriasGestorModule { }
