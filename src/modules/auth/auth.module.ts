import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersGestorModule } from '../users-gestor/users-gestor.module';
import { PassportModule } from '@nestjs/passport';

@Module({
  controllers: [AuthController],
  providers: [AuthService],
  imports: [UsersGestorModule, PassportModule],
})
export class AuthModule { }
