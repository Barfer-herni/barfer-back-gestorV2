import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { RepartosService } from './repartos.service';
import { CreateRepartoDto, UpdateRepartoEntryDto } from './dto/reparto.dto';

@Controller('repartos')
export class RepartosController {
    constructor(private readonly repartosService: RepartosService) { }

    @Get()
    async getRepartosData() {
        const data = await this.repartosService.getRepartosData();
        return { success: true, data };
    }

    @Get('stats')
    async getRepartosStats() {
        const stats = await this.repartosService.getRepartosStats();
        return { success: true, data: stats };
    }

    @Get(':weekKey')
    async getRepartosByWeek(@Param('weekKey') weekKey: string) {
        const data = await this.repartosService.getRepartosByWeek(weekKey);
        return { success: true, data };
    }

    @Post('initialize/:weekKey')
    async initializeWeek(@Param('weekKey') weekKey: string) {
        const success = await this.repartosService.initializeWeek(weekKey);
        return { success };
    }

    @Post(':weekKey')
    async saveRepartosWeek(
        @Param('weekKey') weekKey: string,
        @Body() createRepartoDto: CreateRepartoDto,
    ) {
        const success = await this.repartosService.saveRepartosWeek(weekKey, createRepartoDto.data);
        return { success };
    }

    @Put(':weekKey/:dayKey/:rowIndex')
    async updateRepartoEntry(
        @Param('weekKey') weekKey: string,
        @Param('dayKey') dayKey: string,
        @Param('rowIndex') rowIndex: string,
        @Body() entry: UpdateRepartoEntryDto,
    ) {
        const success = await this.repartosService.updateRepartoEntry(
            weekKey,
            dayKey,
            parseInt(rowIndex),
            entry,
        );
        return { success };
    }

    @Patch('toggle/:weekKey/:dayKey/:rowIndex')
    async toggleRepartoCompletion(
        @Param('weekKey') weekKey: string,
        @Param('dayKey') dayKey: string,
        @Param('rowIndex') rowIndex: string,
    ) {
        const success = await this.repartosService.toggleRepartoCompletion(
            weekKey,
            dayKey,
            parseInt(rowIndex),
        );
        return { success };
    }

    @Post('add-row/:weekKey/:dayKey')
    async addRowToDay(
        @Param('weekKey') weekKey: string,
        @Param('dayKey') dayKey: string,
    ) {
        const success = await this.repartosService.addRowToDay(weekKey, dayKey);
        return { success };
    }

    @Delete('remove-row/:weekKey/:dayKey/:rowIndex')
    async removeRowFromDay(
        @Param('weekKey') weekKey: string,
        @Param('dayKey') dayKey: string,
        @Param('rowIndex') rowIndex: string,
    ) {
        const success = await this.repartosService.removeRowFromDay(
            weekKey,
            dayKey,
            parseInt(rowIndex),
        );
        return { success };
    }

    @Delete(':weekKey')
    async deleteRepartosWeek(@Param('weekKey') weekKey: string) {
        const success = await this.repartosService.deleteRepartosWeek(weekKey);
        return { success };
    }
}
