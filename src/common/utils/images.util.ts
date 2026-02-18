import { BadRequestException } from '@nestjs/common';

export const renameImage = (req, file, callback) => {
  const name: string = file.originalname.split('.')[0];
  const fileExtName: string = file.mimetype.split('/')[1];
  const filename: string = `${Date.now()}-${name}.${fileExtName}`;
  callback(null, filename);
};

export const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return callback(
      new BadRequestException('Only images are accepted!'),
      false,
    );
  }

  callback(null, true);
};
