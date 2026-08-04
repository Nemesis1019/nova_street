import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchSuggestionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  price!: number;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class SearchSuggestionsResponseDto {
  @ApiProperty({ type: [SearchSuggestionDto] })
  data!: SearchSuggestionDto[];
}
