import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import PromoCode from "@/database/promocode.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get all promo codes for the organizer
export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const tokenPayload = verifyToken(req);
        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Only organizers can access this
        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        // Get organizer ID
        let organizerId;
        if (user.role === 'admin') {
            const { searchParams } = new URL(req.url);
            organizerId = searchParams.get('organizerId');
            if (!organizerId) {
                return NextResponse.json(
                    { message: "Organizer ID required for admin access" },
                    { status: 400 }
                );
            }
        } else {
            if (!user.organizerId) {
                return NextResponse.json(
                    { message: "Organizer not found for this user" },
                    { status: 404 }
                );
            }
            organizerId = user.organizerId.toString();
        }

        // Find all promo codes for this organizer
        const promoCodes = await PromoCode.find({
            organizerId: organizerId
        })
            .populate('eventId', 'title slug')
            .sort({ createdAt: -1 });

        // Format promo codes
        const formattedCodes = promoCodes.map((code: any) => ({
            id: code._id.toString(),
            code: code.code,
            description: code.description,
            discountType: code.discountType,
            discountValue: code.discountValue,
            usageLimit: code.usageLimit,
            usedCount: code.usedCount,
            validFrom: code.validFrom,
            validUntil: code.validUntil,
            eventId: code.eventId?._id.toString(),
            event: code.eventId ? {
                id: code.eventId._id.toString(),
                title: code.eventId.title,
                slug: code.eventId.slug,
            } : null,
            minPurchaseAmount: code.minPurchaseAmount,
            maxDiscountAmount: code.maxDiscountAmount,
            isActive: code.isActive,
            createdAt: code.createdAt,
            updatedAt: code.updatedAt,
        }));

        return handleSuccessResponse("Promo codes retrieved successfully", {
            promoCodes: formattedCodes,
            count: formattedCodes.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Create a new promo code
export async function POST(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const tokenPayload = verifyToken(req);
        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Only organizers can create promo codes
        if (user.role !== 'organizer') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        if (!user.organizerId) {
            return NextResponse.json(
                { message: "Organizer not found for this user" },
                { status: 404 }
            );
        }

        const {
            code,
            description,
            discountType,
            discountValue,
            usageLimit,
            validFrom,
            validUntil,
            eventId,
            minPurchaseAmount,
            maxDiscountAmount,
        } = await req.json();

        // Validate required fields
        if (!code || !discountType || !discountValue || !validFrom || !validUntil) {
            return NextResponse.json(
                { message: "Code, discountType, discountValue, validFrom, and validUntil are required" },
                { status: 400 }
            );
        }

        // Validate discount value
        if (discountType === 'percentage' && (discountValue < 0 || discountValue > 100)) {
            return NextResponse.json(
                { message: "Percentage discount must be between 0 and 100" },
                { status: 400 }
            );
        }

        if (discountType === 'fixed' && discountValue < 0) {
            return NextResponse.json(
                { message: "Fixed discount cannot be negative" },
                { status: 400 }
            );
        }

        // Validate dates
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        if (untilDate <= fromDate) {
            return NextResponse.json(
                { message: "Valid until date must be after valid from date" },
                { status: 400 }
            );
        }

        // Check if code already exists
        const existingCode = await PromoCode.findOne({
            code: code.toUpperCase().trim()
        });

        if (existingCode) {
            return NextResponse.json(
                { message: "Promo code already exists" },
                { status: 409 }
            );
        }

        // Validate event if provided
        if (eventId) {
            const event = await Event.findById(eventId);
            if (!event) {
                return NextResponse.json(
                    { message: "Event not found" },
                    { status: 404 }
                );
            }
            // Verify event belongs to this organizer
            if (event.organizerId?.toString() !== user._id.toString()) {
                return NextResponse.json(
                    { message: "Event does not belong to this organizer" },
                    { status: 403 }
                );
            }
        }

        // Create promo code
        const promoCode = await PromoCode.create({
            code: code.toUpperCase().trim(),
            description: description?.trim(),
            discountType,
            discountValue,
            usageLimit,
            validFrom: fromDate,
            validUntil: untilDate,
            eventId: eventId || undefined,
            organizerId: user.organizerId,
            minPurchaseAmount,
            maxDiscountAmount,
            isActive: true,
            createdBy: user._id,
        });

        return handleSuccessResponse("Promo code created successfully", {
            promoCode: {
                id: promoCode._id.toString(),
                code: promoCode.code,
                description: promoCode.description,
                discountType: promoCode.discountType,
                discountValue: promoCode.discountValue,
                usageLimit: promoCode.usageLimit,
                usedCount: promoCode.usedCount,
                validFrom: promoCode.validFrom,
                validUntil: promoCode.validUntil,
                eventId: promoCode.eventId?.toString(),
                isActive: promoCode.isActive,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

// PATCH - Update promo code (activate/deactivate)
export async function PATCH(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const tokenPayload = verifyToken(req);
        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Only organizers can update promo codes
        if (user.role !== 'organizer') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        if (!user.organizerId) {
            return NextResponse.json(
                { message: "Organizer not found for this user" },
                { status: 404 }
            );
        }

        const { codeId, isActive } = await req.json();

        if (!codeId || typeof isActive !== 'boolean') {
            return NextResponse.json(
                { message: "Code ID and isActive status are required" },
                { status: 400 }
            );
        }

        // Find promo code
        const promoCode = await PromoCode.findOne({
            _id: codeId,
            organizerId: user.organizerId
        });

        if (!promoCode) {
            return NextResponse.json(
                { message: "Promo code not found" },
                { status: 404 }
            );
        }

        // Update status
        promoCode.isActive = isActive;
        await promoCode.save();

        return handleSuccessResponse("Promo code updated successfully", {
            promoCode: {
                id: promoCode._id.toString(),
                code: promoCode.code,
                isActive: promoCode.isActive,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Delete promo code
export async function DELETE(req: NextRequest): Promise<NextResponse> {
    try {
        await connectDB();

        const tokenPayload = verifyToken(req);
        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = await User.findOne({
            _id: tokenPayload.id,
            deleted: { $ne: true }
        });

        if (!user) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404 }
            );
        }

        // Only organizers can delete promo codes
        if (user.role !== 'organizer') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        if (!user.organizerId) {
            return NextResponse.json(
                { message: "Organizer not found for this user" },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const codeId = searchParams.get('codeId');

        if (!codeId) {
            return NextResponse.json(
                { message: "Code ID is required" },
                { status: 400 }
            );
        }

        // Find and delete promo code
        const promoCode = await PromoCode.findOne({
            _id: codeId,
            organizerId: user.organizerId
        });

        if (!promoCode) {
            return NextResponse.json(
                { message: "Promo code not found" },
                { status: 404 }
            );
        }

        await PromoCode.findByIdAndDelete(codeId);

        return handleSuccessResponse("Promo code deleted successfully", {
            codeId: promoCode._id.toString(),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

