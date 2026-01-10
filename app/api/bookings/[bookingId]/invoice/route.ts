import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Booking from "@/database/booking.model";
import Event from "@/database/event.model";
import Transaction from "@/database/transaction.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Generate invoice for a booking
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ bookingId: string }> }
): Promise<NextResponse> {
    try {
        await connectDB();

        const { bookingId } = await params;
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

        const booking = await Booking.findById(bookingId);

        if (!booking) {
            return NextResponse.json(
                { message: "Booking not found" },
                { status: 404 }
            );
        }

        // Verify booking belongs to user
        if (booking.userId?.toString() !== user._id.toString() && booking.email !== user.email) {
            return NextResponse.json(
                { message: "Forbidden - You don't have access to this booking" },
                { status: 403 }
            );
        }

        const event = await Event.findById(booking.eventId);
        if (!event) {
            return NextResponse.json(
                { message: "Event not found" },
                { status: 404 }
            );
        }

        // Get transaction if exists
        const transaction = await Transaction.findOne({ bookingId: booking._id });

        // Generate invoice data
        const invoice = {
            invoiceNumber: `INV-${booking._id.toString().slice(-8).toUpperCase()}`,
            date: booking.createdAt.toISOString().split('T')[0],
            customer: {
                name: user.name,
                email: user.email || booking.email,
            },
            event: {
                title: event.title,
                date: event.date,
                time: event.time,
                location: event.location,
            },
            items: [
                {
                    description: `Ticket for ${event.title}`,
                    quantity: 1,
                    unitPrice: event.isFree ? 0 : (event.price || 0) / 100,
                    total: event.isFree ? 0 : (event.price || 0) / 100,
                }
            ],
            subtotal: event.isFree ? 0 : (event.price || 0) / 100,
            discount: transaction?.discountAmount ? transaction.discountAmount / 100 : 0,
            total: transaction?.amount ? transaction.amount / 100 : (event.isFree ? 0 : (event.price || 0) / 100),
            paymentMethod: transaction?.paymentMethod || 'free',
            transactionId: transaction?._id.toString(),
            status: transaction?.status || 'completed',
        };

        return handleSuccessResponse("Invoice generated successfully", {
            invoice,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

