import { Injectable } from '@nestjs/common';
import { Prisma, Organization as PrismaOrganization } from '@prisma/client';
import { Organization } from '../../../domain/organizations/organization.entity';
import { OrganizationSlugAlreadyExistsError } from '../../../application/organizations/errors';
import { OrganizationsRepository } from '../../../application/organizations/organizations.repository';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PrismaOrganizationsRepository implements OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(organization: Organization): Promise<Organization> {
    const data = organization.toJSON();

    try {
      const createdOrganization = await this.prisma.organization.create({
        data: {
          id: data.id,
          name: data.name,
          slug: data.slug,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        },
      });

      return this.toDomain(createdOrganization);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new OrganizationSlugAlreadyExistsError(data.slug);
      }

      throw error;
    }
  }

  async findById(id: string): Promise<Organization | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    return organization ? this.toDomain(organization) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
    });

    return organization ? this.toDomain(organization) : null;
  }

  async list(): Promise<Organization[]> {
    const organizations = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return organizations.map((organization) => this.toDomain(organization));
  }

  private toDomain(organization: PrismaOrganization): Organization {
    return Organization.restore({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    });
  }
}
