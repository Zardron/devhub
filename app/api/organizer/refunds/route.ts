import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Transaction from "@/database/transaction.model";
import Event from "@/database/event.model";
import Booking from "@/database/booking.model";
import Ticket from "@/database/ticket.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get refund requests for organizer's events
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

        // Get organizer's events
        const events = await Event.find({
            organizerId: user._id
        });

        const eventIds = events.map(e => e._id);

        // Get transactions for these events that are eligible for refund
        const transactions = await Transaction.find({
            eventId: { $in: eventIds },
            status: { $in: ['completed', 'pending'] }
        })
            .populate('userId', 'name email')
            .populate('eventId', 'title slug date')
            .populate('bookingId')
            .sort({ createdAt: -1 });

        // Format refund requests
        const refundRequests = transactions
            .filter((transaction: any) => transaction.eventId) // Filter out transactions with missing events
            .map((transaction: any) => ({
                id: transaction._id.toString(),
                transactionId: transaction._id.toString(),
                bookingId: transaction.bookingId?._id.toString(),
                userId: transaction.userId?._id?.toString() || '',
                user: {
                    id: transaction.userId?._id?.toString() || '',
                    name: transaction.userId?.name || 'Unknown',
                    email: transaction.userId?.email || '',
                },
                event: transaction.eventId ? {
                    id: transaction.eventId._id.toString(),
                    title: transaction.eventId.title || 'Unknown Event',
                    slug: transaction.eventId.slug || '',
                    date: transaction.eventId.date || new Date(),
                } : null,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                discountAmount: transaction.discountAmount || 0,
                refundAmount: transaction.refundAmount || 0,
                createdAt: transaction.createdAt,
            }))
            .filter((request: any) => request.event !== null); // Filter out requests with null events

        return handleSuccessResponse("Refund requests retrieved successfully", {
            refundRequests,
            count: refundRequests.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Process a refund
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

        // Only organizers can process refunds
        if (user.role !== 'organizer') {
            return NextResponse.json(
                { message: "Forbidden - Organizer access required" },
                { status: 403 }
            );
        }

        const { transactionId, refundAmount, reason } = await req.json();

        if (!transactionId) {
            return NextResponse.json(
                { message: "Transaction ID is required" },
                { status: 400 }
            );
        }

        // Find transaction
        const transaction = await Transaction.findById(transactionId)
            .populate('eventId')
            .populate('bookingId');

        if (!transaction) {
            return NextResponse.json(
                { message: "Transaction not found" },
                { status: 404 }
            );
        }

        const event = transaction.eventId as any;

        // Verify event belongs to organizer
        if (event.organizerId?.toString() !== user._id.toString()) {
            return NextResponse.json(
                { message: "Forbidden - You don't own this event" },
                { status: 403 }
            );
        }

        // Verify transaction is refundable
        if (transaction.status !== 'completed' && transaction.status !== 'pending') {
            return NextResponse.json(
                { message: `Transaction is ${transaction.status} and cannot be refunded` },
                { status: 400 }
            );
        }

        // Calculate refund amount
        const finalRefundAmount = refundAmount || transaction.amount;

        if (finalRefundAmount > transaction.amount) {
            return NextResponse.json(
                { message: "Refund amount cannot exceed transaction amount" },
                { status: 400 }
            );
        }

        // Update transaction
        if (finalRefundAmount === transaction.amount) {
            transaction.status = 'refunded';
        } else {
            transaction.status = 'partially_refunded';
        }
        transaction.refundAmount = finalRefundAmount;
        transaction.refundedAt = new Date();
        await transaction.save();

        // Cancel associated booking and ticket
        if (transaction.bookingId) {
            const booking = await Booking.findById(transaction.bookingId);
            if (booking) {
                const ticket = await Ticket.findOne({ bookingId: booking._id });
                if (ticket) {
                    ticket.status = 'cancelled';
                    await ticket.save();
                }

                // Update event capacity
                if (event.capacity) {
                    event.availableTickets = Math.min(
                        event.capacity,
                        (event.availableTickets || 0) + 1
                    );
                    await event.save();
                }

                // Delete booking
                await Booking.findByIdAndDelete(booking._id);
            }
        }

        // TODO: Process actual refund through Stripe
        // if (transaction.stripePaymentIntentId) {
        //     const { stripe } = await import("@/lib/stripe");
        //     await stripe.refunds.create({
        //         payment_intent: transaction.stripePaymentIntentId,
        //         amount: finalRefundAmount,
        //     });
        // }

        // Create notification
        const Notification = (await import("@/database/notification.model")).default;
        await Notification.create({
            userId: transaction.userId,
            type: 'refund_processed',
            title: 'Refund Processed',
            message: `Your refund of ${(finalRefundAmount / 100).toFixed(2)} ${transaction.currency.toUpperCase()} for ${event.title} has been processed.`,
            link: `/payments`,
            metadata: {
                transactionId: transaction._id.toString(),
                refundAmount: finalRefundAmount,
                reason: reason || '',
            },
        });

        return handleSuccessResponse("Refund processed successfully", {
            transaction: {
                id: transaction._id.toString(),
                status: transaction.status,
                refundAmount: transaction.refundAmount,
                refundedAt: transaction.refundedAt,
            }
        });
    } catch (error) {
        return handleApiError(error);
    }
}

