"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Button } from "@/components/ui/button";
import { Mail, Send, Users } from "lucide-react";
import toast from "react-hot-toast";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";

export default function CommunicatePage() {
    const { token } = useAuthStore();
    const { data: eventsData } = useOrganizerEvents();
    const events = eventsData?.data?.events || [];
    const [selectedEventId, setSelectedEventId] = useState<string>("");
    const [formData, setFormData] = useState({
        recipientType: "all",
        subject: "",
        message: "",
    });

    // Send email mutation
    const sendEmailMutation = useMutation({
        mutationFn: async (data: any) => {
            if (!token) throw new Error("Not authenticated");
            const response = await fetch("/api/organizer/attendees/communicate", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to send emails");
            }
            return response.json();
        },
        onSuccess: (data) => {
            toast.success(`Emails sent: ${data.data.success} successful, ${data.data.failed} failed`);
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to send emails");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEventId) {
            toast.error("Please select an event");
            return;
        }
        sendEmailMutation.mutate({
            eventId: selectedEventId,
            ...formData,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Communicate with Attendees</h1>
                <p className="text-muted-foreground mt-2">
                    Send emails to event attendees
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-6 border rounded-md bg-card space-y-4">
                    <FormSelect
                        label="Select Event"
                        value={selectedEventId}
                        onChange={(e) => setSelectedEventId(e.target.value)}
                        options={[
                            { value: "", label: "Select an event" },
                            ...events.map((event: any) => ({
                                value: event.id,
                                label: event.title,
                            })),
                        ]}
                        required
                    />

                    <FormSelect
                        label="Recipients"
                        value={formData.recipientType}
                        onChange={(e) => setFormData({ ...formData, recipientType: e.target.value })}
                        options={[
                            { value: "all", label: "All Attendees" },
                            { value: "checked_in", label: "Checked-In Attendees Only" },
                            { value: "not_checked_in", label: "Not Checked-In Attendees Only" },
                        ]}
                        required
                    />

                    <FormInput
                        label="Subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="e.g., Important Update for {event}"
                        required
                        helperText="Use {event} to insert event name"
                    />

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Message
                        </label>
                        <textarea
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            className="w-full min-h-[200px] p-3 border rounded-md resize-y"
                            placeholder="Enter your message here. You can use placeholders: {name}, {event}, {date}, {time}, {location}"
                            required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Available placeholders: {"{name}"}, {"{event}"}, {"{date}"}, {"{time}"}, {"{location}"}
                        </p>
                    </div>

                    <Button
                        type="submit"
                        disabled={sendEmailMutation.isPending || !selectedEventId}
                        className="w-full"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {sendEmailMutation.isPending ? "Sending..." : `Send to ${formData.recipientType === 'all' ? 'All' : formData.recipientType === 'checked_in' ? 'Checked-In' : 'Not Checked-In'} Attendees`}
                    </Button>
                </div>
            </form>
        </div>
    );
}

