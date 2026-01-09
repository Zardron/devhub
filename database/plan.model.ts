import mongoose, { Schema, Model, Document } from 'mongoose';

export interface IPlan extends Document {
    name: string;
    description?: string;
    price: number; // Monthly price in cents
    annualPrice?: number; // Annual price in cents
    currency: string;
    billingCycle: 'monthly' | 'annual';
    features: {
        maxEvents?: number; // null = unlimited
        maxBookingsPerEvent?: number; // null = unlimited
        analytics: boolean;
        customBranding: boolean;
        prioritySupport: boolean;
        apiAccess: boolean;
        whiteLabel: boolean;
        dedicatedAccountManager?: boolean; // Enterprise only
        slaGuarantee?: boolean; // Enterprise only
        customIntegrations?: boolean; // Enterprise only
        advancedSecurity?: boolean; // Enterprise only
        teamManagement?: boolean; // Enterprise only
        advancedReporting?: boolean; // Enterprise only
    };
    limits: {
        eventsPerMonth?: number;
        bookingsPerMonth?: number;
        storageGB?: number;
    };
    isActive: boolean;
    isPopular?: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const planSchema = new Schema<IPlan>(
    {
        name: {
            type: String,
            required: [true, 'Plan name is required'],
            unique: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [0, 'Price cannot be negative'],
        },
        annualPrice: {
            type: Number,
            min: [0, 'Annual price cannot be negative'],
        },
        currency: {
            type: String,
            required: [true, 'Currency is required'],
            default: 'php',
            uppercase: true,
        },
        billingCycle: {
            type: String,
            enum: ['monthly', 'annual'],
            default: 'monthly',
        },
        features: {
            maxEvents: {
                type: Number,
                default: null, // null means unlimited
            },
            maxBookingsPerEvent: {
                type: Number,
                default: null,
            },
            analytics: {
                type: Boolean,
                default: false,
            },
            customBranding: {
                type: Boolean,
                default: false,
            },
            prioritySupport: {
                type: Boolean,
                default: false,
            },
            apiAccess: {
                type: Boolean,
                default: false,
            },
            whiteLabel: {
                type: Boolean,
                default: false,
            },
            dedicatedAccountManager: {
                type: Boolean,
                default: false,
            },
            slaGuarantee: {
                type: Boolean,
                default: false,
            },
            customIntegrations: {
                type: Boolean,
                default: false,
            },
            advancedSecurity: {
                type: Boolean,
                default: false,
            },
            teamManagement: {
                type: Boolean,
                default: false,
            },
            advancedReporting: {
                type: Boolean,
                default: false,
            },
        },
        limits: {
            eventsPerMonth: {
                type: Number,
                default: null,
            },
            bookingsPerMonth: {
                type: Number,
                default: null,
            },
            storageGB: {
                type: Number,
                default: 1,
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isPopular: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

planSchema.index({ isActive: 1 });
planSchema.index({ name: 1 }, { unique: true });

const Plan = mongoose.models.Plan || mongoose.model<IPlan>('Plan', planSchema);
export default Plan;

