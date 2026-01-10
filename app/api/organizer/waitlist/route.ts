import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Waitlist from "@/database/waitlist.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get waitlist entries
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

        if (user.role !== 'organizer' && user.role !== 'admin') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        let events;
        if (eventId) {
            const event = await Event.findById(eventId);
            if (!event) {
                return NextResponse.json(
                    { message: "Event not found" },
                    { status: 404 }
                );
            }
            if (user.role === 'organizer' && event.organizerId?.toString() !== user._id.toString()) {
                return NextResponse.json(
                    { message: "Forbidden - You don't own this event" },
                    { status: 403 }
                );
            }
            events = [event];
        } else {
            events = await Event.find({ organizerId: user._id });
        }

        const eventIds = events.map(e => e._id);

        // Get waitlist entries
        const waitlistEntries = await Waitlist.find({
            eventId: { $in: eventIds }
        })
            .populate('eventId', 'title slug date')
            .sort({ position: 1 });

        // Format waitlist entries
        const formattedWaitlist = waitlistEntries.map((entry: any) => ({
            id: entry._id.toString(),
            email: entry.email,
            eventId: entry.eventId._id.toString(),
            event: {
                id: entry.eventId._id.toString(),
                title: entry.eventId.title,
                slug: entry.eventId.slug,
                date: entry.eventId.date,
            },
            position: entry.position,
            notified: entry.notified,
            notifiedAt: entry.notifiedAt,
            convertedToBooking: entry.convertedToBooking,
            convertedAt: entry.convertedAt,
            createdAt: entry.createdAt,
        }));

        return handleSuccessResponse("Waitlist retrieved successfully", {
            waitlist: formattedWaitlist,
            count: formattedWaitlist.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

