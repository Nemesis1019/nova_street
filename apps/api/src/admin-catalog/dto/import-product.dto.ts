import { ApiProperty } from '@nestjs/swagger';

export class ImportProductDto {
  @ApiProperty({ type: 'string', format: 'binary' })
  file!: Express.Multer.File;
}
