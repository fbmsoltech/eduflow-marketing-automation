import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  InvalidOrganizationNameError,
  InvalidOrganizationSlugError,
} from '../../domain/organizations/organization.entity';
import {
  OrganizationNotFoundError,
  OrganizationSlugAlreadyExistsError,
} from '../../application/organizations/errors';
import { CreateOrganizationUseCase } from '../../application/organizations/use-cases/create-organization.use-case';
import { FindOrganizationByIdUseCase } from '../../application/organizations/use-cases/find-organization-by-id.use-case';
import { ListOrganizationsUseCase } from '../../application/organizations/use-cases/list-organizations.use-case';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { OrganizationResponseDto } from './dto/organization-response.dto';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Organizations')
@ApiInternalServerErrorResponse({
  description: 'Unexpected internal server error',
  type: ErrorResponseDto,
})
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly createOrganizationUseCase: CreateOrganizationUseCase,
    private readonly listOrganizationsUseCase: ListOrganizationsUseCase,
    private readonly findOrganizationByIdUseCase: FindOrganizationByIdUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create Organization' })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiCreatedResponse({ description: 'Organization created', type: OrganizationResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid request payload', type: ErrorResponseDto })
  @ApiConflictResponse({ description: 'Organization slug already exists', type: ErrorResponseDto })
  async create(@Body() body: unknown): Promise<OrganizationResponseDto> {
    const dto = CreateOrganizationDto.fromBody(body);

    try {
      const organization = await this.createOrganizationUseCase.execute({
        name: dto.name,
        slug: dto.slug,
      });

      return OrganizationResponseDto.fromDomain(organization);
    } catch (error) {
      this.handleError(error);
    }
  }

  @Get()
  @ApiOperation({ summary: 'List organizations' })
  @ApiOkResponse({
    description: 'Organizations returned',
    type: OrganizationResponseDto,
    isArray: true,
  })
  async list(): Promise<OrganizationResponseDto[]> {
    const organizations = await this.listOrganizationsUseCase.execute();

    return organizations.map((organization) => OrganizationResponseDto.fromDomain(organization));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  @ApiParam({ name: 'id', format: 'uuid', description: 'Organization ID' })
  @ApiOkResponse({ description: 'Organization returned', type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found', type: ErrorResponseDto })
  async findById(@Param('id') id: string): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.findOrganizationByIdUseCase.execute(id);

      return OrganizationResponseDto.fromDomain(organization);
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof OrganizationSlugAlreadyExistsError) {
      throw new ConflictException('Organization slug already exists');
    }

    if (error instanceof OrganizationNotFoundError) {
      throw new NotFoundException('Organization not found');
    }

    if (
      error instanceof InvalidOrganizationNameError ||
      error instanceof InvalidOrganizationSlugError
    ) {
      throw new BadRequestException(error.message);
    }

    throw error;
  }
}
