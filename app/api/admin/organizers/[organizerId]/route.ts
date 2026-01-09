import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Organizer from "@/database/organizer.model";
import mongoose from "mongoose";

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ organizerId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        // Verify token
        const tokenPayload = verifyToken(req);

        if (!tokenPayload) {
            return NextResponse.json(
                { message: "Unauthorized - Invalid or missing token" },
                { status: 401 }
            );
        }

        // Get user to check if they are admin (exclude soft-deleted users)
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

        // Check if user is admin
        if (user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Admin access required" },
                { status: 403 }
            );
        }

        const { organizerId } = await params;

        if (!organizerId) {
            return NextResponse.json(
                { message: "Organizer ID is required" },
                { status: 400 }
            );
        }

        // Validate organizerId format
        if (!mongoose.Types.ObjectId.isValid(organizerId)) {
            return NextResponse.json(
                { message: "Invalid organizer ID format" },
                { status: 400 }
            );
        }

        // Find the organizer
        const organizer = await Organizer.findOne({
            _id: organizerId,
            deleted: { $ne: true }
        });

        if (!organizer) {
            return NextResponse.json(
                { message: "Organizer not found" },
                { status: 404 }
            );
        }

        const organizerObjectId = new mongoose.Types.ObjectId(organizerId);

        // Find all users associated with this organizer by organizerId
        const associatedUsers = await User.find({
            organizerId: organizerObjectId,
            deleted: { $ne: true }
        });

        // Soft delete all associated users
        const deletedUsersCount = await User.updateMany(
            { organizerId: organizerObjectId, deleted: { $ne: true } },
            { deleted: true }
        );

        // Soft delete the organizer itself
        organizer.deleted = true;
        await organizer.save();

        return handleSuccessResponse(
            "Organizer and all associated users deleted successfully",
            {
                organizerId: organizerId,
                deletedUsersCount: deletedUsersCount.modifiedCount,
            }
        );
    } catch (error) {
        return handleApiError(error);
    }
}

