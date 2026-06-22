import { BadRequestException } from '@nestjs/common';

export class CreateOrganizationDto {
  constructor(
    readonly name: string,
    readonly slug: string,
  ) {}

  static fromBody(body: unknown): CreateOrganizationDto {
    if (!this.isRecord(body)) {
      throw new BadRequestException('Request body must be an object');
    }

    const name = body['name'];
    const slug = body['slug'];

    if (typeof name !== 'string' || !name.trim()) {
      throw new BadRequestException('name must be a non-empty string');
    }

    if (typeof slug !== 'string' || !slug.trim()) {
      throw new BadRequestException('slug must be a non-empty string');
    }

    return new CreateOrganizationDto(name, slug);
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
