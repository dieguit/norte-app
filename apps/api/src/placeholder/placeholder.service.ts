import { Injectable, NotFoundException } from '@nestjs/common';
import type { PlaceholderItem } from '@repo/shared-types';
import { randomUUID } from 'node:crypto';
import { CreatePlaceholderDto } from './dto/create-placeholder.dto';
import { UpdatePlaceholderDto } from './dto/update-placeholder.dto';

@Injectable()
export class PlaceholderService {
  private readonly items: PlaceholderItem[] = [
    {
      id: '6f0a7482-29a0-4c03-a3e1-256add2f91a8',
      title: 'TODO: replace this placeholder item',
      description: 'TODO: wire this to real application data later',
      status: 'todo',
      createdAt: new Date('2026-07-01T00:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-07-01T00:00:00.000Z').toISOString(),
    },
  ];

  create(createPlaceholderDto: CreatePlaceholderDto): PlaceholderItem {
    const now = new Date().toISOString();
    const item: PlaceholderItem = {
      id: randomUUID(),
      title: createPlaceholderDto.title,
      description: createPlaceholderDto.description ?? '',
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };

    this.items.push(item);
    return item;
  }

  findAll(): PlaceholderItem[] {
    return this.items;
  }

  findOne(id: string): PlaceholderItem {
    const item = this.items.find((current) => current.id === id);
    if (!item) {
      throw new NotFoundException(`Placeholder item "${id}" not found`);
    }

    return item;
  }

  update(
    id: string,
    updatePlaceholderDto: UpdatePlaceholderDto,
  ): PlaceholderItem {
    const item = this.findOne(id);
    Object.assign(item, updatePlaceholderDto, {
      updatedAt: new Date().toISOString(),
    });
    return item;
  }

  remove(id: string): void {
    const index = this.items.findIndex((current) => current.id === id);
    if (index === -1) {
      throw new NotFoundException(`Placeholder item "${id}" not found`);
    }

    this.items.splice(index, 1);
  }
}
