import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Ticket from "@/database/ticket.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ ticketNumber: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { ticketNumber } = await params;
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

        const ticket = await Ticket.findOne({ ticketNumber })
            .populate({
                path: 'bookingId',
                populate: {
                    path: 'eventId',
                    model: 'Event',
                },
            });

        if (!ticket) {
            return NextResponse.json(
                { message: "Ticket not found" },
                { status: 404 }
            );
        }

        const booking = ticket.bookingId as any;
        const event = booking?.eventId;

        if (!event) {
            return NextResponse.json(
                { message: "Event not found for this ticket" },
                { status: 404 }
            );
        }

        // Verify ticket belongs to user
        if (booking.email !== user.email) {
            return NextResponse.json(
                { message: "You don't have access to this ticket" },
                { status: 403 }
            );
        }

        return handleSuccessResponse("Ticket retrieved successfully", {
            ticket: {
                id: ticket._id.toString(),
                ticketNumber: ticket.ticketNumber,
                qrCode: ticket.qrCode,
                status: ticket.status,
                checkedInAt: ticket.checkedInAt,
                event: {
                    title: event.title,
                    date: event.date,
                    time: event.time,
                    location: event.location,
                    venue: event.venue,
                    image: event.image,
                },
                booking: {
                    createdAt: booking.createdAt,
                },
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

