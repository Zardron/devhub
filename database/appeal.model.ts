import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IAppeal extends Document {
    email: string;
    reason: string;
    userId?: string;
    status: 'pending' | 'reviewed' | 'approved' | 'rejected';
    reviewedBy?: string;
    reviewedAt?: Date;
    adminNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const appealSchema = new Schema<IAppeal>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            validate: {
                validator: (v: string) => {
                    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
                },
                message: 'Please enter a valid email address',
            },
        },
        reason: {
            type: String,
            required: [true, 'Reason is required'],
            trim: true,
            validate: {
                validator: (v: string) => v.trim().length > 0 && v.trim().length <= 2000,
                message: 'Reason must be between 1 and 2000 characters',
            },
        },
        userId: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'approved', 'rejected'],
            default: 'pending',
        },
        reviewedBy: {
            type: String,
            trim: true,
        },
        reviewedAt: {
            type: Date,
        },
        adminNotes: {
            type: String,
            trim: true,
            maxlength: 1000,
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster lookups
appealSchema.index({ email: 1 });
appealSchema.index({ status: 1 });
appealSchema.index({ createdAt: -1 });

export default mongoose.models.Appeal || mongoose.model<IAppeal>('Appeal', appealSchema) as Model<IAppeal>;

