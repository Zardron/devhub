import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Event from "@/database/event.model";
import Ticket from "@/database/ticket.model";
import Booking from "@/database/booking.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get check-in history
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

        // Get organizer's events
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

        // Get all bookings for these events
        const bookings = await Booking.find({
            eventId: { $in: eventIds }
        });

        const bookingIds = bookings.map(b => b._id);

        // Get checked-in tickets
        const checkedInTickets = await Ticket.find({
            bookingId: { $in: bookingIds },
            status: 'used',
            checkedInAt: { $exists: true }
        })
            .populate('bookingId')
            .populate('checkedInBy', 'name email')
            .sort({ checkedInAt: -1 });

        // Format check-in history
        const checkInHistory = await Promise.all(
            checkedInTickets.map(async (ticket: any) => {
                const booking = ticket.bookingId;
                const event = await Event.findById(booking.eventId);
                const user = await User.findById(booking.userId).select('name email');

                return {
                    id: ticket._id.toString(),
                    ticketNumber: ticket.ticketNumber,
                    event: {
                        id: event?._id.toString(),
                        title: event?.title,
                        date: event?.date,
                        time: event?.time,
                    },
                    attendee: {
                        name: user?.name || booking.email,
                        email: user?.email || booking.email,
                    },
                    checkedInAt: ticket.checkedInAt,
                    checkedInBy: ticket.checkedInBy ? {
                        id: ticket.checkedInBy._id.toString(),
                        name: ticket.checkedInBy.name,
                        email: ticket.checkedInBy.email,
                    } : null,
                };
            })
        );

        return handleSuccessResponse("Check-in history retrieved successfully", {
            checkInHistory,
            count: checkInHistory.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

