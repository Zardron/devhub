import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Organizer from "@/database/organizer.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";
import mongoose from "mongoose";

// GET - Get team members for the organizer
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
        let organizerId: mongoose.Types.ObjectId;
        if (user.role === 'admin') {
            const { searchParams } = new URL(req.url);
            const orgId = searchParams.get('organizerId');
            if (!orgId) {
                return NextResponse.json(
                    { message: "Organizer ID required for admin access" },
                    { status: 400 }
                );
            }
            organizerId = new mongoose.Types.ObjectId(orgId);
        } else {
            if (!user.organizerId) {
                return NextResponse.json(
                    { message: "Organizer not found for this user" },
                    { status: 404 }
                );
            }
            organizerId = user.organizerId;
        }

        // Find all team members (users with this organizerId but role 'user')
        const teamMembers = await User.find({
            organizerId: organizerId,
            role: 'user',
            deleted: { $ne: true }
        }).select('-password').sort({ createdAt: -1 });

        // Format team members
        const formattedMembers = teamMembers.map((member: any) => ({
            id: member._id.toString(),
            name: member.name,
            email: member.email,
            createdAt: member.createdAt,
            updatedAt: member.updatedAt,
        }));

        return handleSuccessResponse("Team members retrieved successfully", {
            teamMembers: formattedMembers,
            count: formattedMembers.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Add a team member
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

        // Only organizers can add team members
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

        const { email, name, password } = await req.json();

        if (!email || !name || !password) {
            return NextResponse.json(
                { message: "Email, name, and password are required" },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existingUser = await User.findOne({
            email: email.toLowerCase().trim(),
            deleted: { $ne: true }
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "User with this email already exists" },
                { status: 409 }
            );
        }

        // Create team member (role 'user' with organizerId)
        const teamMember = await User.create({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password: password, // Will be hashed by pre-save hook
            role: 'user',
            organizerId: user.organizerId,
        });

        return handleSuccessResponse("Team member added successfully", {
            teamMember: {
                id: teamMember._id.toString(),
                name: teamMember.name,
                email: teamMember.email,
                role: teamMember.role,
                organizerId: teamMember.organizerId?.toString(),
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

// DELETE - Remove a team member
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

        // Only organizers can remove team members
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
        const memberId = searchParams.get('memberId');

        if (!memberId) {
            return NextResponse.json(
                { message: "Member ID is required" },
                { status: 400 }
            );
        }

        // Find the team member
        const teamMember = await User.findOne({
            _id: memberId,
            organizerId: user.organizerId,
            role: 'user',
            deleted: { $ne: true }
        });

        if (!teamMember) {
            return NextResponse.json(
                { message: "Team member not found" },
                { status: 404 }
            );
        }

        // Soft delete the team member
        teamMember.deleted = true;
        await teamMember.save();

        return handleSuccessResponse("Team member removed successfully", {
            memberId: teamMember._id.toString(),
        });
    } catch (error) {
        return handleApiError(error);
    }
}

