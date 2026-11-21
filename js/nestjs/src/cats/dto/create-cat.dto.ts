import { IsInt, IsString, Length, Max, Min } from 'class-validator';

/**
 * DTO + class-validator = padanan `record CreateCatRequest(@NotBlank ...)` + @Valid di Spring.
 * Validasi di sini menjaga "bentuk" request (tipe, panjang). Aturan bisnis tetap di domain `Cat`.
 * ValidationPipe global (lihat configure-app.ts) yang menjalankan validasi ini.
 */
export class CreateCatDto {
  @IsString()
  @Length(2, 40)
  name!: string;

  @IsString()
  @Length(1, 40)
  breed!: string;

  @IsInt()
  @Min(0)
  @Max(30)
  age!: number;
}
