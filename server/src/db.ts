import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { AstronautData, UserData, UserType, SymptomLog, CaptainLog, DoctorAdvice, MissionProcedure, MassProtocol, DailyCheckInLog, MissionTask, EarthlinkMessage } from '../../types';

// --- Sub-document Schemas ---

const SymptomLogSchema = new Schema<SymptomLog>({
    id: { type: String, required: true },
    date: { type: String, required: true },
    symptom: { type: String, required: true },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], required: true },
    notes: { type: String, default: '' },
    photo: String,
    video: String,
});

const DoctorAdviceSchema = new Schema<DoctorAdvice>({
    id: { type: String, required: true },
    date: { type: String, required: true },
    text: { type: String, required: true },
    symptomLogId: { type: String, required: true },
});

const CaptainLogSchema = new Schema<CaptainLog>({
    id: { type: String, required: true },
    date: { type: String, required: true },
    text: { type: String, default: '' },
    photo: String,
    video: String,
});

const MissionTaskSchema = new Schema<MissionTask>({
    id: { type: Number, required: true },
    time: { type: String, required: true },
    name: { type: String, required: true },
    completed: { type: Boolean, required: true },
});

const MissionProcedureSchema = new Schema<MissionProcedure>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    steps: [{ id: String, text: String }],
});

const MassProtocolSchema = new Schema<MassProtocol>({
    id: { type: String, required: true },
    name: { type: String, required: true },
    sets: { type: Number, required: true },
    duration: { type: Number, required: true },
    rest: { type: Number, required: true },
});

const DailyCheckInLogSchema = new Schema<DailyCheckInLog>({
    date: { type: String, required: true },
    mood: { type: String, required: true },
    sleep: { type: String, required: true },
});

const EarthlinkMessageSchema = new Schema<EarthlinkMessage>({
    id: { type: String, required: true },
    date: { type: String, required: true },
    from: { type: String, required: true },
    text: String,
    photoUrl: String,
    videoUrl: String,
    viewed: { type: Boolean, default: false },
});


// --- Main AstronautData Schema ---
const AstronautDataSchema = new Schema<AstronautData>({
    name: { type: String, required: true, unique: true, lowercase: true },
    photoUrl: String,
    designation: { type: String, required: true },
    missionTasks: [MissionTaskSchema],
    symptomLogs: [SymptomLogSchema],
    captainLogs: [CaptainLogSchema],
    doctorAdvice: [DoctorAdviceSchema],
    massProtocols: [MassProtocolSchema],
    procedures: [MissionProcedureSchema],
    dailyCheckInLogs: [DailyCheckInLogSchema],
    earthlinkMessages: [EarthlinkMessageSchema],
});

export const Astronaut = mongoose.model<AstronautData>('Astronaut', AstronautDataSchema);


// --- User Schema for Authentication ---
export interface IUser extends Document, Omit<UserData, 'password'> {
    name: string;
    type: UserType;
    password?: string;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    type: { type: String, enum: ['astronaut', 'admin'], required: true },
    securityQuestion: { type: String, required: true },
    securityAnswer: { type: String, required: true, select: false },
});

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

export const User = mongoose.model<IUser>('User', UserSchema);

// --- DB Connection ---
export const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
            console.error('MONGO_URI not defined in .env file');
            // Fix: Cast 'process' to 'any' to resolve TypeScript error about missing 'exit' property.
            // This is a workaround for a likely missing or misconfigured @types/node.
            (process as any).exit(1);
        }
        await mongoose.connect(mongoUri);
        console.log('MongoDB Connected...');
    } catch (err: any) {
        console.error(err.message);
        // Fix: Cast 'process' to 'any' to resolve TypeScript error about missing 'exit' property.
        (process as any).exit(1);
    }
};