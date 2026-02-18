import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import { v4 } from 'uuid';
import { ROLES_KEY } from '../../common/enums/roles.enum';
import {
  comparePassword,
  hashPassword,
} from '../../common/utils/password.util';
import { MailerService } from '../mailer/mailer.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  async register(registerDto: RegisterDto) {
    const user = await this.userService.findOneByEmailWithOutException(
      registerDto.email,
    );

    if (user) {
      throw new ConflictException('User already exists');
    }

    registerDto.password = await hashPassword(registerDto.password);

    await this.userService.create(registerDto);

    return {
      message: 'User created successfully',
    };
  }

  async login(
    loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = await this.userService.findOneByEmail(loginDto.email);
    if (!user) {
      throw new UnauthorizedException('Wrong emial!');
    }

    const isValidPassword = await comparePassword(
      loginDto.password,
      user.password,
    );
    if (!isValidPassword) {
      throw new UnauthorizedException('Wrong password!');
    }

    const userRole =
      typeof user.role === 'string' ? user.role : ROLES_KEY[user.role];

    const payload = {
      email: user.email,
      sub: user.id,
      role: userRole,
    };

    const token = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    res.status(200).json({
      access_token: token,
      refresh_token: refreshToken,
      user_email: user.email,
    });
  }

  async googleLogin(req): Promise<any> {
    if (!req.user) {
      throw new BadRequestException('No user from Google');
    }

    const { email, firstName, lastName } = req.user;

    let user = await this.userService.findOneByEmailWithOutException(email);

    if (!user) {
      // Si el usuario no existe, lo registramos automáticamente
      const registerDto = new RegisterDto();
      registerDto.email = email;
      registerDto.name = firstName;
      registerDto.lastName = lastName;
      registerDto.role = 3;
      registerDto.password = v4(); // Puedes asignar una contraseña vacía o generar una aleatoria
      user = await this.userService.create(registerDto);
    }

    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
    };

    const token = await this.jwtService.signAsync(payload);

    const refreshToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    return {
      message: 'User logged in successfully',
      access_token: token,
      refreshToken,
      user_email: user.email,
    };
  }

  async logout(@Req() req: Request, @Res() res: Response) {
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.status(200).send({
      message: 'Logout success',
    });
  }

  async requestResetPassword(resetPasswordDto: RequestResetPasswordDto) {
    const { email } = resetPasswordDto;
    const user = await this.userService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = { email };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    user.resetPasswordToken = token;
    await this.mailerService.sendPasswordResetEmail(user.email, token);
    await this.userService.update(user.id, user);

    return { message: 'Correo de recuperación enviado' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { resetPasswordToken, password } = resetPasswordDto;

    let payload;
    try {
      payload = this.jwtService.verify(resetPasswordToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      }) as { email: string };
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }

    const user = await this.userService.findOneByEmail(payload.email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.resetPasswordToken !== resetPasswordToken) {
      throw new BadRequestException('Invalid reset password token');
    }

    user.password = await hashPassword(password);
    user.resetPasswordToken = null;
    return await this.userService.update(user.id, user);
  }

  async refreshToken(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const [, tokenRefresh] = req.headers.authorization.split(' ') || [];

      const user = await this.jwtService.verifyAsync(tokenRefresh, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
      const payload = { sub: user.id, email: user.email, role: user.role };

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const token = await this.jwtService.signAsync(payload);

      const refreshToken = await this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN'),
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      res.status(200).json({
        access_token: token,
        refresh_token: refreshToken,
        user_email: user.email,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(token: string, password: string, newPassword: string) {
    const payload = await this.jwtService.verifyAsync(token);
    const user = await this.userService.findOneByEmail(payload.email);

    const passwordHash = await hashPassword(password);
    if (
      (await comparePassword(password, user.password)) &&
      (await comparePassword(password, passwordHash))
    ) {
      user.password = await hashPassword(newPassword);
      await this.userService.create(user);

      return {
        message: 'Password changed successfully',
      };
    }

    throw new UnauthorizedException('Invalid password');
  }
}
