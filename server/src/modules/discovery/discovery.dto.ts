import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() nameEn!: string;
  @ApiProperty() nameAr!: string;
  @ApiProperty() nameTr!: string;
}

export class CityPublicDto extends CategoryPublicDto {}

export class CommunityPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() name!: string;
  @ApiProperty() description!: string;
  @ApiProperty() admissionMode!: string;
  @ApiPropertyOptional({ type: Number, nullable: true }) capacity!: number | null;
  @ApiProperty() hostName!: string;
  @ApiProperty() ownerType!: string;
  @ApiProperty() ownerId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) organizationSlug!: string | null;
  @ApiProperty() cityId!: string;
  @ApiProperty() cityName!: string;
  @ApiProperty({ type: [CategoryPublicDto] }) categories!: CategoryPublicDto[];
}

export class EventPublicDto {
  @ApiProperty() id!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() title!: string;
  @ApiProperty() description!: string;
  @ApiProperty() visibility!: string;
  @ApiProperty() hostName!: string;
  @ApiProperty() hostType!: string;
  @ApiProperty() hostId!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) organizationSlug!: string | null;
  @ApiProperty() online!: boolean;
  @ApiPropertyOptional({ type: String, nullable: true }) locationName!: string | null;
  @ApiProperty() startsAt!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) endsAt!: string | null;
  @ApiProperty() cancelled!: boolean;
  @ApiPropertyOptional({ type: Number, nullable: true }) capacity!: number | null;
  @ApiProperty() admissionMode!: string;
  @ApiPropertyOptional({ type: String, nullable: true }) cityId!: string | null;
  @ApiPropertyOptional({ type: String, nullable: true }) cityName!: string | null;
  @ApiProperty({ type: [CategoryPublicDto] }) categories!: CategoryPublicDto[];
}

export class CommunityPageDto {
  @ApiProperty({ type: [CommunityPublicDto] }) items!: CommunityPublicDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class EventPageDto {
  @ApiProperty({ type: [EventPublicDto] }) items!: EventPublicDto[];
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
