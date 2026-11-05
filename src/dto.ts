import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  IsTimeZone,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'demo1' }) @IsString() @MaxLength(64) @MinLength(1) username!: string;
  @ApiProperty({ example: 'LocalDemo!2026' })
  @IsString()
  @MaxLength(256)
  @MinLength(1)
  password!: string;
}
export class CategoryCreateDto {
  @ApiProperty({ example: 'Groceries' }) @IsString() @MinLength(1) @MaxLength(60) name!: string;
}
export class PasswordChangeDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(256) current_password!: string;
  @ApiProperty() @IsString() @MinLength(12) @MaxLength(256) new_password!: string;
}
export class CategoryPatchDto {
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsBoolean() active?: boolean;
}
export class HouseholdPatchDto {
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name?: string;
  @ApiPropertyOptional({ example: 'America/New_York' })
  @ValidateIf((_, v) => v !== undefined)
  @IsTimeZone()
  timezone?: string;
  @ApiPropertyOptional({ example: 21 })
  @ValidateIf((_, v) => v !== undefined)
  @IsInt()
  @Min(0)
  @Max(23)
  digest_hour?: number;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsBoolean()
  digest_enabled?: boolean;
}
export class TransactionPatchDto {
  @ApiProperty({ example: 1 }) @IsInt() @Min(1) version!: number;
  @ApiPropertyOptional({ nullable: true, type: Number })
  @ValidateIf((_, v) => v !== undefined && v !== null)
  @IsInt()
  @Min(1)
  category?: number | null;
  @ApiPropertyOptional({ type: [Number], maxItems: 50 })
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  categories?: number[];
  @ApiPropertyOptional({ enum: ['expense', 'income', 'transfer', 'refund'] })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(['expense', 'income', 'transfer', 'refund'])
  flow?: 'expense' | 'income' | 'transfer' | 'refund';
  @ApiPropertyOptional() @ValidateIf((_, v) => v !== undefined) @IsBoolean() reviewed?: boolean;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(1000)
  note?: string;
}
export class PageQuery {
  @ApiPropertyOptional({ default: 1 })
  @ValidateIf((_, v) => v !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page?: number;
}
export class TransactionQuery extends PageQuery {
  @ApiPropertyOptional({ example: '2026-11' })
  @ValidateIf((_, v) => v !== undefined)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(100)
  search?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(['true', 'false'])
  pending?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(['true', 'false'])
  reviewed?: string;
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @ValidateIf((_, v) => v !== undefined)
  @IsIn(['true', 'false'])
  uncategorized?: string;
}
export class SummaryQuery {
  @ApiPropertyOptional({ example: '2026-11' })
  @ValidateIf((_, v) => v !== undefined)
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}
export class ExportQuery extends OmitType(TransactionQuery, ['page'] as const) {
  @ApiPropertyOptional({ enum: ['csv', 'pdf'], default: 'csv' })
  @IsIn(['csv', 'pdf'])
  format: 'csv' | 'pdf' = 'csv';
}
export class ExchangeDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(500) public_token!: string;
  @ApiPropertyOptional()
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  account_id?: string;
}
export class SelectAccountDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(150) account_id!: string;
}
