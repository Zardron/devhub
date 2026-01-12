"use client";

import { useState } from "react";
import { useOrganizerEvents, useOrganizerAttendees } from "@/lib/hooks/api/organizer.queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { FormSelect } from "@/components/ui/form-select";
import { formatDateToReadable } from "@/lib/formatters";
import { Users, Download, Search, FileText, ExternalLink, CheckCircle, XCircle, AlertTriangle, Ticket } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import toast from "react-hot-toast";

export default function AttendeesPage() {
    const { data: eventsData } = useOrganizerEvents();
    // handleSuccessResponse spreads the data object, so events is at the root level
    const events = eventsData?.events || eventsData?.data?.events || [];
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    
    const { data: attendeesData, isLoading, error } = useOrganizerAttendees(selectedEventId);
    // handleSuccessResponse spreads the data object, so attendees is at the root level
    const attendees = (attendeesData as any)?.attendees || attendeesData?.data?.attendees || [];
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    
    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [selectedAttendee, setSelectedAttendee] = useState<{ id: string; name: string; email: string } | null>(null);
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Attendees Data:', { attendeesData, attendees, selectedEventId, error });
    }

    // Mutation for confirming/rejecting bookings
    const updateBookingStatusMutation = useMutation({
        mutationFn: async ({ bookingId, paymentStatus }: { bookingId: string; paymentStatus: 'confirmed' | 'rejected' }) => {
            if (!token) throw new Error("Not authenticated");
            
            const response = await fetch(`/api/bookings/${bookingId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ paymentStatus }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to update booking status');
            }

            return response.json();
        },
        onSuccess: (data, variables) => {
            toast.success(`Booking ${variables.paymentStatus === 'confirmed' ? 'confirmed' : 'rejected'} successfully`);
            // Invalidate attendees query to refresh the list
            queryClient.invalidateQueries({ queryKey: ["organizer", "attendees", selectedEventId] });
            queryClient.invalidateQueries({ queryKey: ["organizer", "attendees"] });
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Failed to update booking status');
        },
    });

    const handleExport = async () => {
        if (!attendees.length) {
            toast.error("No attendees to export");
            return;
        }

        try {
            const { useAuthStore } = await import("@/lib/store/auth.store");
            const { token } = useAuthStore.getState();
            
            if (!token) {
                toast.error("Not authenticated");
                return;
            }

            const url = selectedEventId 
                ? `/api/organizer/attendees/export?eventId=${selectedEventId}`
                : `/api/organizer/attendees/export`;

            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                throw new Error("Failed to export attendees");
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = downloadUrl;
            a.download = `attendees-${selectedEventId || 'all'}-${Date.now()}.csv`;
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            
            toast.success("Attendees exported successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to export attendees");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Attendees</h1>
                <p className="text-muted-foreground mt-2">Manage and view event attendees</p>
            </div>

            <div className="flex items-end gap-4">
                <div className="flex-1 max-w-md">
                    <FormSelect
                        label="Select Event"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        options={[
                            { value: "", label: "All Events" },
                            ...events.map((e) => ({
                                value: e.id,
                                label: e.title,
                            })),
                        ]}
                    />
                </div>
                {attendees.length > 0 && (
                    <Button onClick={handleExport} variant="outline" className="mb-0">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    <div className="h-10 bg-muted rounded w-full animate-pulse"></div>
                    <div className="border rounded-lg overflow-hidden animate-pulse">
                        <div className="h-12 bg-muted/50"></div>
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-16 bg-muted/30 border-t"></div>
                        ))}
                    </div>
                </div>
            ) : attendees.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                        {selectedEventId ? "No attendees for this event yet" : "No attendees found. Select an event or create bookings."}
                    </p>
                </div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-muted">
                            <tr>
                                <th className="px-6 py-3 text-left text-sm font-medium">Name</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Email</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Ticket</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Payment Status</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Receipt</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Booked At</th>
                                <th className="px-6 py-3 text-left text-sm font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {attendees.map((attendee: any) => (
                                <tr key={attendee.id}>
                                    <td className="px-6 py-4">{attendee.name || "N/A"}</td>
                                    <td className="px-6 py-4">{attendee.email}</td>
                                    <td className="px-6 py-4">
                                        {attendee.ticketNumber ? (() => {
                                            const bookingId = attendee.bookingId || attendee.id;
                                            const href = bookingId 
                                                ? `/bookings?id=${bookingId}&ticketNumber=${attendee.ticketNumber}`
                                                : `/bookings?ticketNumber=${attendee.ticketNumber}`;
                                            return (
                                                <Link
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-400 transition-colors font-mono text-sm font-medium border border-blue-500/20"
                                                >
                                                    <Ticket className="w-3.5 h-3.5" />
                                                    {attendee.ticketNumber}
                                                </Link>
                                            );
                                        })() : (
                                            <span className="text-sm text-muted-foreground">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {attendee.paymentStatus ? (
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium uppercase ${
                                                    attendee.paymentStatus === "confirmed"
                                                        ? "bg-green-500/10 text-green-500"
                                                        : attendee.paymentStatus === "rejected"
                                                        ? "bg-red-500/10 text-red-500"
                                                        : "bg-yellow-500/10 text-yellow-500"
                                                }`}
                                            >
                                                {attendee.paymentStatus}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-500/10 text-gray-500">
                                                Free
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {attendee.receiptUrl ? (
                                            <a
                                                href={attendee.receiptUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600 hover:underline"
                                            >
                                                <FileText className="w-4 h-4" />
                                                View Receipt
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">N/A</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-muted-foreground">
                                        {new Date(attendee.bookedAt).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {attendee.paymentStatus === 'pending' ? (
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => {
                                                        setSelectedAttendee({
                                                            id: attendee.id,
                                                            name: attendee.name || attendee.email,
                                                            email: attendee.email
                                                        });
                                                        setShowConfirmDialog(true);
                                                    }}
                                                    disabled={updateBookingStatusMutation.isPending}
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setSelectedAttendee({
                                                            id: attendee.id,
                                                            name: attendee.name || attendee.email,
                                                            email: attendee.email
                                                        });
                                                        setShowRejectDialog(true);
                                                    }}
                                                    disabled={updateBookingStatusMutation.isPending}
                                                >
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Reject
                                                </Button>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Confirm Payment Dialog */}
            <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <AlertDialogContent className="glass border border-primary/30">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle className="w-6 h-6 text-green-500" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-bold text-light-100">
                                Confirm Payment
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-light-200 pt-2">
                            Are you sure you want to confirm the payment for{" "}
                            <span className="font-semibold text-light-100">
                                {selectedAttendee?.name}
                            </span>
                            ?
                            <br />
                            <span className="text-sm text-light-200/70 mt-2 block">
                                ({selectedAttendee?.email})
                            </span>
                            <br />
                            <span className="text-sm text-light-200/70 mt-2 block">
                                This action will generate a ticket and notify the attendee.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-dark-200/50 border-border-dark/50 text-light-200 hover:bg-dark-200/70 hover:text-light-100">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selectedAttendee) {
                                    updateBookingStatusMutation.mutate({
                                        bookingId: selectedAttendee.id,
                                        paymentStatus: 'confirmed'
                                    });
                                    setShowConfirmDialog(false);
                                    setSelectedAttendee(null);
                                }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={updateBookingStatusMutation.isPending}
                        >
                            {updateBookingStatusMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Confirming...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Confirm Payment
                                </span>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Payment Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent className="glass border border-red-500/30">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                            <AlertDialogTitle className="text-2xl font-bold text-light-100">
                                Reject Payment
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="text-light-200 pt-2">
                            Are you sure you want to reject the payment for{" "}
                            <span className="font-semibold text-light-100">
                                {selectedAttendee?.name}
                            </span>
                            ?
                            <br />
                            <span className="text-sm text-light-200/70 mt-2 block">
                                ({selectedAttendee?.email})
                            </span>
                            <br />
                            <span className="text-sm text-red-400/80 mt-2 block">
                                This action cannot be undone. The attendee will be notified of the rejection.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="bg-dark-200/50 border-border-dark/50 text-light-200 hover:bg-dark-200/70 hover:text-light-100">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (selectedAttendee) {
                                    updateBookingStatusMutation.mutate({
                                        bookingId: selectedAttendee.id,
                                        paymentStatus: 'rejected'
                                    });
                                    setShowRejectDialog(false);
                                    setSelectedAttendee(null);
                                }
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={updateBookingStatusMutation.isPending}
                        >
                            {updateBookingStatusMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Rejecting...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4" />
                                    Reject Payment
                                </span>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

