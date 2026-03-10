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
import { hashPassword } from '../../common/utils/password.util';
import { UsersGestorService } from '../users-gestor/users-gestor.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersGestorService: UsersGestorService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async register(registerDto: RegisterDto) {
    const user = await this.usersGestorService.findByEmail(registerDto.email);

    if (user) {
      throw new ConflictException('User already exists');
    }

    return this.usersGestorService.create({
      ...registerDto,
      role: registerDto.role || 'user',
    } as any);
  }

  async login(
    loginDto: LoginDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.usersGestorService.login(loginDto.email, loginDto.password);
    res.status(200).json({
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      user_email: result.user.email,
      user: result.user,
    });
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
    const user = await this.usersGestorService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = { email };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '1h',
    });

    await this.usersGestorService.update(user.id, { resetPasswordToken: token } as any);

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

    const user = await this.usersGestorService.findByEmail(payload.email);

    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (user.resetPasswordToken !== resetPasswordToken) {
      throw new BadRequestException('Invalid reset password token');
    }

    await this.usersGestorService.update(user.id, {
      password: password,
      resetPasswordToken: null
    } as any);
    return { success: true };
  }

  async refreshToken(@Req() req: Request, @Res() res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) throw new UnauthorizedException('No authorization header');
      const [, tokenRefresh] = authHeader.split(' ');

      const result = await this.usersGestorService.refreshToken(tokenRefresh);

      res.status(200).json({
        access_token: result.access_token,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async changePassword(token: string, password: string, newPassword: string) {
    const payload = await this.jwtService.verifyAsync(token);
    return this.usersGestorService.changePassword(payload.sub, password, newPassword);
  }
}
