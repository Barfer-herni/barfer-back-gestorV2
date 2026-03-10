import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Mayoristas, MayoristaSchema } from '../../schemas/mayoristas.schema';
import { UsersGestorController } from './users-gestor.controller';
import { UsersGestorService } from './users-gestor.service';
import { UserGestor, UserGestorSchema } from '../../schemas/user-gestor.schema';

@Module({
  controllers: [UsersGestorController],
  providers: [UsersGestorService],
  imports: [
    MongooseModule.forFeature([
      {
        name: UserGestor.name,
        schema: UserGestorSchema
      },
    ]),
  ],
  exports: [UsersGestorService],
})
export class UsersGestorModule { }
