import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = this.getTokenFromRequest(request);
    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
      request['user'] = payload;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Unauthorized');
    }
    return true;
  }

  private getTokenFromRequest(request: Request): string {
    if (!request.headers.authorization)
      throw new UnauthorizedException('Unauthorized');
    const [type, token] = request.headers.authorization.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
