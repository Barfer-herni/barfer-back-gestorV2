import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model, Types, isValidObjectId } from 'mongoose';
import * as bcrypt from 'bcryptjs';

import { CreateUserGestorDto } from './dto/users-gestor.dto';
import { UpdateUserGestorDto } from './dto/update.dto';
import { UserGestor } from 'src/schemas/user-gestor.schema';

@Injectable()
export class UsersGestorService {
  constructor(
    @InjectModel(UserGestor.name) private readonly usersGestorModel: Model<UserGestor>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }


  async create(data: CreateUserGestorDto) {
    try {
      // Verificar si ya existe un usuario con ese email
      const existingUser = await this.usersGestorModel.findOne({ email: data.email });

      if (existingUser) {
        throw new BadRequestException('Ya existe un usuario con este email');
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(data.password, 12);

      // Asegurarse de que el permiso 'account:view_own' siempre esté presente
      const permissionsSet = new Set(data.permissions || []);
      permissionsSet.add('account:view_own');

      const newUser = new this.usersGestorModel({
        ...data,
        password: hashedPassword,
        permissions: Array.from(permissionsSet),
      });
      const result = await newUser.save();
      const userObj = result.toObject();
      delete userObj.password;

      return {
        success: true,
        user: {
          ...userObj,
          id: result._id.toString(),
          _id: result._id.toString(),
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new InternalServerErrorException(
        error instanceof Error ? error.message : 'Error al crear el usuario',
      );
    }
  }

  /**
   * Obtener un usuario por ID
   */
  async findOne(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }
    const user = await this.usersGestorModel.findById(userId).select('-password');
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return {
      ...user.toObject(),
      id: user._id.toString(),
      _id: user._id.toString(),
    } as any;
  }

  /**
   * Obtener un usuario por email (incluye password para verificación)
   */
  async findByEmail(email: string) {
    const user = await this.usersGestorModel.findOne({ email });

    if (!user) {
      return null;
    }

    const userObj = user.toObject();
    return {
      ...userObj,
      id: user._id.toString(),
      _id: user._id.toString(),
    };
  }

  /**
   * Obtener todos los usuarios excluyendo al usuario actual
   */
  async findAll(excludeUserId?: string) {
    let query = excludeUserId && isValidObjectId(excludeUserId)
      ? { _id: { $ne: new Types.ObjectId(excludeUserId) } }
      : {};
    const users = await this.usersGestorModel
      .find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    return users.map((user) => ({
      ...user.toObject(),
      id: user._id.toString(),
      _id: user._id.toString(),
    }));
  }

  /**
   * Actualizar un usuario existente
   */
  async update(userId: string, data: UpdateUserGestorDto) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 12);
    }

    const user = await this.usersGestorModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true },
    ).select('-password');

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...user.toObject(),
      id: user._id.toString(),
      _id: user._id.toString(),
    };
  }

  /**
   * Eliminar un usuario
   */
  async remove(userId: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const result = await this.usersGestorModel.deleteOne({ _id: userId });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return { success: true };
  }

  /**
   * Verificar credenciales de usuario
   */
  async verifyCredentials(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    const passwordMatch = await bcrypt.compare(password, user.password!);

    if (!passwordMatch) {
      return { success: false, message: 'Credenciales inválidas' };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Cambiar contraseña de un usuario
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!isValidObjectId(userId)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const user = await this.usersGestorModel.findById(userId);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!passwordMatch) {
      throw new BadRequestException('La contraseña actual no es correcta');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await this.usersGestorModel.updateOne(
      { _id: userId },
      { $set: { password: hashedNewPassword } }
    );

    return {
      success: true,
      message: 'Contraseña actualizada exitosamente',
    };
  }

  /**
   * Login para usuarios gestor - verifica credenciales y genera JWT
   */
  async login(email: string, password: string) {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatch = await bcrypt.compare(password, user.password!);

    if (!passwordMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
      puntoEnvio: user.puntoEnvio || undefined,
    };

    const access_token = this.jwtService.sign(payload);

    const refresh_token = this.jwtService.sign(
      { sub: user.id },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'supersecreto-refresh',
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '60d',
      },
    );

    return {
      access_token,
      refresh_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        lastName: user.lastName,
        role: user.role,
        permissions: user.permissions || [],
        puntoEnvio: user.puntoEnvio || undefined,
      },
    };
  }

  /**
   * Refresh token - genera nuevo access_token
   */
  async refreshToken(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'supersecreto-refresh',
      });

      const user = await this.findOne(decoded.sub);

      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        puntoEnvio: user.puntoEnvio || undefined,
      };

      const access_token = this.jwtService.sign(payload);

      return { access_token };
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }
}
