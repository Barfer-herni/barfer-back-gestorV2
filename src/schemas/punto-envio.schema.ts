import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class DaySchedule {
    @Prop({ type: Boolean, default: true })
    isOpen: boolean;

    @Prop({ type: String, default: "15:00" })
    cutoffTime: string;
}
const DayScheduleSchema = SchemaFactory.createForClass(DaySchedule);

@Schema({ _id: false })
export class WeeklySchedule {
    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    monday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    tuesday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    wednesday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    thursday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    friday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: true, cutoffTime: "15:00" }) })
    saturday: DaySchedule;

    @Prop({ type: DayScheduleSchema, default: () => ({ isOpen: false, cutoffTime: "15:00" }) })
    sunday: DaySchedule;
}
const WeeklyScheduleSchema = SchemaFactory.createForClass(WeeklySchedule);

@Schema({ _id: true })
export class DateException {
    @Prop({ required: true })
    date: string; // YYYY-MM-DD

    @Prop({ default: false })
    isOpen: boolean;

    @Prop()
    cutoffTime?: string;
}
const DateExceptionSchema = SchemaFactory.createForClass(DateException);


@Schema({
    timestamps: true,
    collection: 'puntos_envio'
})
export class PuntoEnvio {
    _id: string;

    @Prop({ required: true })
    nombre: string;

    @Prop({ required: false })
    cutoffTime?: string;

    @Prop({ type: WeeklyScheduleSchema, default: () => ({}) })
    weeklySchedule: WeeklySchedule;

    @Prop({ type: [DateExceptionSchema], default: [] })
    exceptions: DateException[];

    @Prop({ required: true })
    createdAt: string;

    @Prop({ required: true })
    updatedAt: string;
}

export const PuntoEnvioSchema = SchemaFactory.createForClass(PuntoEnvio);

