import mongoose, { Schema, Model, Document, Types } from 'mongoose';
import Event from './event.model';

export interface IWaitlist extends Document {
    email: string;
    eventId: Types.ObjectId;
    position: number; // Position in waitlist
    notified: boolean; // Whether user was notified when spot became available
    notifiedAt?: Date;
    convertedToBooking?: boolean; // Whether they got a booking
    convertedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const waitlistSchema = new Schema<IWaitlist>(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            validate: {
                validator: (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
                message: 'Please enter a valid email address',
            },
        },
        eventId: {
            type: Schema.Types.ObjectId,
            ref: 'Event',
            required: [true, 'Event ID is required'],
            index: true,
        },
        position: {
            type: Number,
            required: [true, 'Position is required'],
            min: [1, 'Position must be at least 1'],
        },
        notified: {
            type: Boolean,
            default: false,
        },
        notifiedAt: {
            type: Date,
        },
        convertedToBooking: {
            type: Boolean,
            default: false,
        },
        convertedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure one waitlist entry per email per event
waitlistSchema.index({ email: 1, eventId: 1 }, { unique: true });
waitlistSchema.index({ eventId: 1, position: 1 });
waitlistSchema.index({ notified: 1, convertedToBooking: 1 });

const Waitlist = mongoose.models.Waitlist || mongoose.model<IWaitlist>('Waitlist', waitlistSchema);
export default Waitlist;

