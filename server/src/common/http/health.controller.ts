import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiProperty, ApiTags } from '@nestjs/swagger';

class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], type: String })
  status!: 'ok';

  @ApiProperty({ format: 'date-time', type: String })
  timestamp!: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
