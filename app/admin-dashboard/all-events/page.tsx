import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "All Events | Admin Dashboard | TechHub",
    description: "View and manage all events",
};

export default function AllEventsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">All Events</h1>
                    <p className="text-muted-foreground mt-2">
                        View and manage all events on the platform
                    </p>
                </div>
                <Link
                    href="/admin-dashboard/add-events"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                    <PlusIcon className="w-4 h-4" />
                    Add Event
                </Link>
            </div>

            <div className="border rounded-lg p-6">
                <p className="text-muted-foreground">
                    Events list will be implemented here.
                </p>
            </div>
        </div>
    );
}