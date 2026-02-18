import { PartialType, PickType } from '@nestjs/mapped-types';
import { UserDto } from './user.dto';

export class UpdateUserDto extends PartialType(
  PickType(UserDto, ['name', 'lastName', 'phoneNumber'] as const),
) {}
