import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiProperty,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { sql } from 'drizzle-orm';
import { DATABASE, type Database } from '../../db/database.module';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], type: String })
  status!: 'ok';

  @ApiProperty({ format: 'date-time', type: String })
  timestamp!: string;
}

class ReadinessResponseDto extends HealthResponseDto {
  @ApiProperty({ enum: ['up'], type: String })
  database!: 'up';
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(DATABASE) private readonly db: Database | undefined) {}

  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @ApiOkResponse({ type: ReadinessResponseDto })
  @ApiServiceUnavailableResponse({ description: 'The database connection is unavailable.' })
  async getReadiness(): Promise<ReadinessResponseDto> {
    if (!this.db) throw new ServiceUnavailableException('Database is not configured.');
    try {
      await this.db.execute(sql`select 1`);
    } catch {
      throw new ServiceUnavailableException('Database is unavailable.');
    }
    return { status: 'ok', database: 'up', timestamp: new Date().toISOString() };
  }
}
