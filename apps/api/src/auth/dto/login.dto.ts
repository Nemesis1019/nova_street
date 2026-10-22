import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  /** true = cookie de sesión persistente; false = cookie de sesión (se borra al cerrar el navegador). */
  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
