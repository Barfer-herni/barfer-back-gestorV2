import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Reparto, RepartoEntry } from '../../schemas/repartos.schema';
import { CreateRepartoDto, UpdateRepartoEntryDto } from './dto/reparto.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RepartosService {
    private readonly logger = new Logger(RepartosService.name);

    constructor(
        @InjectModel(Reparto.name) private repartoModel: Model<Reparto>,
    ) { }

    /**
     * Obtiene todos los datos de repartos
     */
    async getRepartosData(): Promise<Record<string, RepartoEntry[]>> {
        try {
            // Buscar todos los documentos de semanas
            const weeks = await this.repartoModel.find({}).sort({ updatedAt: -1 }).exec();

            const data: Record<string, RepartoEntry[]> = {};
            const seenWeekKeys = new Set<string>();

            // Si hay múltiples documentos para la misma semana, usar el más reciente
            weeks.forEach((week) => {
                if (week.weekKey && week.data) {
                    const weekKey = week.weekKey;
                    // Solo tomar el primer documento encontrado para cada weekKey (el más reciente por el sort)
                    if (!seenWeekKeys.has(weekKey)) {
                        // week.data is a Mongoose Map, we convert it to a plain object
                        const weekData: any = {};
                        week.data.forEach((val, key) => {
                            weekData[key] = val;
                        });
                        data[weekKey] = weekData;
                        seenWeekKeys.add(weekKey);
                    }
                }
            });

            return data;
        } catch (error) {
            this.logger.error('Error getting repartos data:', error);
            return {};
        }
    }

    /**
     * Obtiene los datos de repartos para una semana específica
     */
    async getRepartosByWeek(weekKey: string): Promise<Record<string, RepartoEntry[]> | null> {
        try {
            const result = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (!result || !result.data) {
                return null;
            }

            const data: any = {};
            result.data.forEach((val, key) => {
                data[key] = val;
            });
            return data;
        } catch (error) {
            this.logger.error('Error getting repartos by week:', error);
            return null;
        }
    }

    /**
     * Guarda o actualiza los datos de repartos para una semana específica
     */
    async saveRepartosWeek(weekKey: string, weekData: Record<string, RepartoEntry[]>): Promise<boolean> {
        try {
            const existing = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (existing) {
                await this.repartoModel.updateOne(
                    { _id: existing._id },
                    {
                        $set: {
                            data: weekData,
                            updatedAt: new Date(),
                        },
                    },
                );

                // Eliminar duplicados
                await this.repartoModel.deleteMany({
                    weekKey,
                    _id: { $ne: existing._id },
                });

                return true;
            } else {
                const newReparto = new this.repartoModel({
                    weekKey,
                    data: weekData,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                await newReparto.save();
                return true;
            }
        } catch (error) {
            this.logger.error('Error saving repartos week:', error);
            return false;
        }
    }

    /**
     * Actualiza una entrada específica de repartos
     */
    async updateRepartoEntry(
        weekKey: string,
        dayKey: string,
        rowIndex: number,
        entry: UpdateRepartoEntryDto,
    ): Promise<boolean> {
        try {
            const currentDoc = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (!currentDoc || !currentDoc.data) {
                this.logger.error('Document not found for update');
                return false;
            }

            const dayData = currentDoc.data.get(dayKey);
            if (!dayData || !dayData[rowIndex]) {
                this.logger.error('Entry not found for update');
                return false;
            }

            const currentEntry = dayData[rowIndex];

            const updatedEntry = {
                ...currentEntry,
                ...entry,
                id: currentEntry.id, // Preservar el id original
            };

            const updateQuery = {};
            updateQuery[`data.${dayKey}.${rowIndex}`] = updatedEntry;
            updateQuery['updatedAt'] = new Date();

            const result = await this.repartoModel.updateOne(
                { _id: currentDoc._id },
                { $set: updateQuery },
            );

            return result.modifiedCount > 0;
        } catch (error) {
            this.logger.error('Error updating reparto entry:', error);
            return false;
        }
    }

    /**
     * Marca una entrada como completada
     */
    async toggleRepartoCompletion(
        weekKey: string,
        dayKey: string,
        rowIndex: number,
    ): Promise<boolean> {
        try {
            const current = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (!current || !current.data) {
                return false;
            }

            const dayData = current.data.get(dayKey);
            if (!dayData || !dayData[rowIndex]) {
                return false;
            }

            const currentEntry = dayData[rowIndex];
            const newIsCompleted = !currentEntry.isCompleted;

            const updateQuery = {};
            updateQuery[`data.${dayKey}.${rowIndex}.isCompleted`] = newIsCompleted;
            updateQuery['updatedAt'] = new Date();

            const result = await this.repartoModel.updateOne(
                { _id: current._id },
                { $set: updateQuery },
            );

            return result.modifiedCount > 0;
        } catch (error) {
            this.logger.error('Error toggling reparto completion:', error);
            return false;
        }
    }

    /**
     * Elimina una semana completa de repartos
     */
    async deleteRepartosWeek(weekKey: string): Promise<boolean> {
        try {
            const result = await this.repartoModel.deleteOne({ weekKey }).exec();
            return result.deletedCount > 0;
        } catch (error) {
            this.logger.error('Error deleting repartos week:', error);
            return false;
        }
    }

    /**
     * Obtiene estadísticas de repartos
     */
    async getRepartosStats() {
        try {
            const weeks = await this.repartoModel.find({}).exec();
            let totalEntries = 0;
            let completedEntries = 0;

            weeks.forEach((week) => {
                week.data.forEach((dayEntries) => {
                    totalEntries += dayEntries.length;
                    completedEntries += dayEntries.filter((entry) => entry.isCompleted).length;
                });
            });

            const completionRate = totalEntries > 0 ? (completedEntries / totalEntries) * 100 : 0;

            return {
                totalWeeks: weeks.length,
                completedEntries,
                totalEntries,
                completionRate: Math.round(completionRate * 100) / 100,
            };
        } catch (error) {
            this.logger.error('Error getting repartos stats:', error);
            return {
                totalWeeks: 0,
                completedEntries: 0,
                totalEntries: 0,
                completionRate: 0,
            };
        }
    }

    /**
     * Inicializa una semana con datos vacíos
     */
    async initializeWeek(weekKey: string): Promise<boolean> {
        try {
            const existing = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (existing) {
                return true;
            }

            const weekData: Record<string, any[]> = {};
            for (let i = 1; i <= 6; i++) {
                weekData[i.toString()] = Array(3)
                    .fill(null)
                    .map(() => ({
                        id: uuidv4(),
                        text: '',
                        isCompleted: false,
                    }));
            }

            const newReparto = new this.repartoModel({
                weekKey,
                data: weekData,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await newReparto.save();
            return true;
        } catch (error) {
            this.logger.error('Error initializing week:', error);
            return false;
        }
    }

    /**
     * Agrega una fila adicional a un día específico
     */
    async addRowToDay(weekKey: string, dayKey: string): Promise<boolean> {
        try {
            const week = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (!week || !week.data) {
                return false;
            }

            const newRow = {
                id: uuidv4(),
                text: '',
                isCompleted: false,
            };

            const updateQuery = {};
            updateQuery[`data.${dayKey}`] = newRow;

            const result = await this.repartoModel.updateOne(
                { _id: week._id },
                {
                    $push: updateQuery,
                    $set: { updatedAt: new Date() },
                },
            );

            return result.modifiedCount > 0;
        } catch (error) {
            this.logger.error('Error adding row to day:', error);
            return false;
        }
    }

    /**
     * Elimina una fila específica de un día
     */
    async removeRowFromDay(weekKey: string, dayKey: string, rowIndex: number): Promise<boolean> {
        try {
            const week = await this.repartoModel
                .findOne({ weekKey })
                .sort({ updatedAt: -1 })
                .exec();

            if (!week || !week.data) {
                return false;
            }

            const dayData = week.data.get(dayKey);
            if (!dayData || dayData.length <= 1) {
                return false;
            }

            const filteredRows = dayData.filter((_, index) => index !== rowIndex);

            const updateQuery = {};
            updateQuery[`data.${dayKey}`] = filteredRows;

            const result = await this.repartoModel.updateOne(
                { _id: week._id },
                {
                    $set: {
                        ...updateQuery,
                        updatedAt: new Date(),
                    },
                },
            );

            return result.modifiedCount > 0;
        } catch (error) {
            this.logger.error('Error removing row from day:', error);
            return false;
        }
    }
}
