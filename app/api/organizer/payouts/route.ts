import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/database/user.model";
import Transaction from "@/database/transaction.model";
import Payout from "@/database/payout.model";
import Event from "@/database/event.model";
import { handleApiError, handleSuccessResponse } from "@/lib/utils";

// GET - Get payout history and available balance
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

        // Get organizer's events
        const events = await Event.find({
            organizerId: organizerId
        });

        const eventIds = events.map(e => e._id);

        // Get all completed transactions for organizer's events
        const transactions = await Transaction.find({
            eventId: { $in: eventIds },
            status: 'completed'
        });

        // Calculate available balance (organizer revenue from unpaid transactions)
        const payouts = await Payout.find({
            organizerId: organizerId,
            status: { $in: ['pending', 'processing', 'completed'] }
        });

        const paidTransactionIds = new Set();
        payouts.forEach((payout: any) => {
            payout.transactionIds.forEach((id: any) => {
                paidTransactionIds.add(id.toString());
            });
        });

        const unpaidTransactions = transactions.filter((t: any) => 
            !paidTransactionIds.has(t._id.toString())
        );

        const availableBalance = unpaidTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const totalEarned = transactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);
        const totalPaid = payouts
            .filter((p: any) => p.status === 'completed')
            .reduce((sum, p) => sum + (p.amount || 0), 0);

        // Get payout history
        const payoutHistory = await Payout.find({
            organizerId: organizerId
        })
            .populate('processedBy', 'name email')
            .sort({ createdAt: -1 });

        const formattedPayouts = payoutHistory.map((payout: any) => ({
            id: payout._id.toString(),
            amount: payout.amount,
            currency: payout.currency,
            status: payout.status,
            paymentMethod: payout.paymentMethod,
            requestedAt: payout.requestedAt,
            processedAt: payout.processedAt,
            processedBy: payout.processedBy ? {
                id: payout.processedBy._id.toString(),
                name: payout.processedBy.name,
            } : null,
            failureReason: payout.failureReason,
            createdAt: payout.createdAt,
        }));

        return handleSuccessResponse("Payout data retrieved successfully", {
            availableBalance,
            totalEarned,
            totalPaid,
            pendingBalance: totalEarned - totalPaid - availableBalance,
            payouts: formattedPayouts,
            unpaidTransactionCount: unpaidTransactions.length,
        });
    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Request a payout
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

        // Only organizers can request payouts
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

        const { amount, paymentMethod, accountDetails } = await req.json();

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { message: "Valid amount is required" },
                { status: 400 }
            );
        }

        if (!paymentMethod) {
            return NextResponse.json(
                { message: "Payment method is required" },
                { status: 400 }
            );
        }

        // Get organizer's events
        const events = await Event.find({
            organizerId: user.organizerId
        });

        const eventIds = events.map(e => e._id);

        // Get unpaid transactions
        const transactions = await Transaction.find({
            eventId: { $in: eventIds },
            status: 'completed'
        });

        const payouts = await Payout.find({
            organizerId: user.organizerId,
            status: { $in: ['pending', 'processing', 'completed'] }
        });

        const paidTransactionIds = new Set();
        payouts.forEach((payout: any) => {
            payout.transactionIds.forEach((id: any) => {
                paidTransactionIds.add(id.toString());
            });
        });

        const unpaidTransactions = transactions.filter((t: any) => 
            !paidTransactionIds.has(t._id.toString())
        );

        const availableBalance = unpaidTransactions.reduce((sum, t) => sum + (t.organizerRevenue || 0), 0);

        // Validate amount doesn't exceed available balance
        if (amount > availableBalance) {
            return NextResponse.json(
                { message: `Requested amount exceeds available balance of ${(availableBalance / 100).toFixed(2)}` },
                { status: 400 }
            );
        }

        // Check minimum payout amount (e.g., 1000 cents = $10)
        const minimumPayout = 1000; // 10.00 in cents
        if (amount < minimumPayout) {
            return NextResponse.json(
                { message: `Minimum payout amount is ${(minimumPayout / 100).toFixed(2)}` },
                { status: 400 }
            );
        }

        // Select transactions to include (up to requested amount)
        let remainingAmount = amount;
        const selectedTransactions: any[] = [];
        
        for (const transaction of unpaidTransactions) {
            if (remainingAmount <= 0) break;
            const transactionRevenue = transaction.organizerRevenue || 0;
            if (transactionRevenue <= remainingAmount) {
                selectedTransactions.push(transaction._id);
                remainingAmount -= transactionRevenue;
            }
        }

        // Create payout request
        const payout = await Payout.create({
            organizerId: user.organizerId,
            amount,
            currency: 'php',
            status: 'pending',
            paymentMethod,
            accountDetails: accountDetails || {},
            transactionIds: selectedTransactions,
            requestedAt: new Date(),
        });

        return handleSuccessResponse("Payout request created successfully", {
            payout: {
                id: payout._id.toString(),
                amount: payout.amount,
                status: payout.status,
                requestedAt: payout.requestedAt,
            }
        }, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

