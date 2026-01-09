"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth.store";
import { Calendar, MapPin, Clock, QrCode, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateToReadable, formatDateTo12Hour } from "@/lib/formatters";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";

interface TicketData {
    id: string;
    ticketNumber: string;
    qrCode: string;
    status: string;
    event: {
        title: string;
        date: string;
        time: string;
        location: string;
        venue: string;
        image: string;
    };
}

export default function BookingTicketPage() {
    const params = useParams();
    const router = useRouter();
    const bookingId = params.bookingId as string;
    const { token } = useAuthStore();
    const [ticket, setTicket] = useState<TicketData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (bookingId && token) {
            fetchTicket();
        }
    }, [bookingId, token]);

    const fetchTicket = async () => {
        try {
            const response = await fetch(`/api/bookings/${bookingId}/ticket`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error("Failed to fetch ticket");
            }

            const data = await response.json();
            setTicket(data.data.ticket);
        } catch (error: any) {
            toast.error(error.message || "Failed to load ticket");
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-muted-foreground">Loading ticket...</div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-2">Ticket Not Found</h1>
                    <p className="text-muted-foreground mb-4">The ticket for this booking doesn't exist.</p>
                    <Link href="/bookings">
                        <Button>Back to Bookings</Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <Link href="/bookings">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Bookings
                    </Button>
                </Link>

                <div className="bg-card border rounded-2xl shadow-lg overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary/20 to-primary/10 p-8 border-b">
                        <h1 className="text-3xl font-bold mb-2">Your Ticket</h1>
                        <p className="text-muted-foreground">Ticket #{ticket.ticketNumber}</p>
                    </div>

                    <div className="p-8">
                        <div className="grid md:grid-cols-2 gap-8">
                            {/* Event Details */}
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold mb-4">{ticket.event.title}</h2>
                                    <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                                        <Image
                                            src={ticket.event.image}
                                            alt={ticket.event.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Date</p>
                                            <p className="font-medium">{formatDateToReadable(ticket.event.date)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <Clock className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Time</p>
                                            <p className="font-medium">{formatDateTo12Hour(ticket.event.time)}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-5 h-5 text-muted-foreground" />
                                        <div>
                                            <p className="text-sm text-muted-foreground">Location</p>
                                            <p className="font-medium">{ticket.event.location}</p>
                                            <p className="text-sm text-muted-foreground">{ticket.event.venue}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* QR Code */}
                            <div className="space-y-6">
                                <div className="bg-muted/50 p-6 rounded-lg text-center">
                                    <QrCode className="w-8 h-8 mx-auto mb-4 text-muted-foreground" />
                                    <h3 className="font-semibold mb-4">QR Code</h3>
                                    <div className="bg-white p-4 rounded-lg inline-block">
                                        <Image
                                            src={ticket.qrCode}
                                            alt="QR Code"
                                            width={200}
                                            height={200}
                                            className="mx-auto"
                                        />
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-4">
                                        Show this QR code at the event entrance
                                    </p>
                                </div>

                                <div className="p-4 border rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-1">Ticket Number</p>
                                    <p className="font-mono font-bold text-lg">{ticket.ticketNumber}</p>
                                </div>

                                <Button onClick={() => router.push(`/tickets/${ticket.ticketNumber}`)} variant="outline" className="w-full">
                                    <Download className="w-4 h-4 mr-2" />
                                    View Full Ticket
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

