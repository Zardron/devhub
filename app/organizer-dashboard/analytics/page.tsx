"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/store/auth.store";
import { useOrganizerStats } from "@/lib/hooks/api/organizer.queries";
import { useOrganizerEvents } from "@/lib/hooks/api/organizer.queries";
import { FormInput } from "@/components/ui/form-input";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, TrendingUp, Ticket, Download } from "lucide-react";
import toast from "react-hot-toast";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

export default function AnalyticsPage() {
    const { token } = useAuthStore();
    const [dateRange, setDateRange] = useState({
        startDate: "",
        endDate: "",
    });
    const [useCustomRange, setUseCustomRange] = useState(false);

    const { data: statsData } = useOrganizerStats();
    const { data: eventsData } = useOrganizerEvents();
    
    // Fetch analytics with custom date range
    const { data: analyticsData } = useQuery({
        queryKey: ["organizer", "analytics", dateRange.startDate, dateRange.endDate],
        queryFn: async () => {
            if (!token) throw new Error("Not authenticated");
            const url = useCustomRange && dateRange.startDate && dateRange.endDate
                ? `/api/organizer/analytics?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
                : "/api/organizer/analytics";
            const response = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch analytics");
            return response.json();
        },
        enabled: !!token && (!useCustomRange || (dateRange.startDate && dateRange.endDate)),
    });
    
    const stats = statsData?.data || {
        totalEvents: 0,
        upcomingEvents: 0,
        totalBookings: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
    };

    const events = eventsData?.data?.events || [];

    // Export analytics data
    const handleExport = () => {
        const analytics = analyticsData?.data || {};
        const csvRows = [];
        
        csvRows.push(['Analytics Report']);
        csvRows.push(['Generated', new Date().toISOString()]);
        if (useCustomRange && dateRange.startDate && dateRange.endDate) {
            csvRows.push(['Date Range', `${dateRange.startDate} to ${dateRange.endDate}`]);
        }
        csvRows.push(['']);
        csvRows.push(['Summary']);
        csvRows.push(['Total Events', stats.totalEvents]);
        csvRows.push(['Upcoming Events', stats.upcomingEvents]);
        csvRows.push(['Total Bookings', stats.totalBookings]);
        csvRows.push(['Total Revenue', (stats.totalRevenue / 100).toFixed(2)]);
        csvRows.push(['Monthly Revenue', (stats.monthlyRevenue / 100).toFixed(2)]);
        csvRows.push(['']);
        
        if (analytics.monthlyRevenue) {
            csvRows.push(['Monthly Revenue Breakdown']);
            csvRows.push(['Month', 'Revenue'].join(','));
            analytics.monthlyRevenue.forEach((item: any) => {
                csvRows.push([item.month, (item.revenue / 100).toFixed(2)].join(','));
            });
        }

        const csvContent = csvRows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Analytics data exported successfully");
    };

    // Prepare chart data
    const eventsByStatus = events.reduce((acc: any, event: any) => {
        acc[event.status] = (acc[event.status] || 0) + 1;
        return acc;
    }, {});

    const statusData = Object.entries(eventsByStatus).map(([name, value]) => ({
        name,
        value,
    }));

    const eventsByMode = events.reduce((acc: any, event: any) => {
        acc[event.mode] = (acc[event.mode] || 0) + 1;
        return acc;
    }, {});

    const modeData = Object.entries(eventsByMode).map(([name, value]) => ({
        name,
        value,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Analytics</h1>
                    <p className="text-muted-foreground mt-2">Track your event performance and revenue</p>
                </div>
                <Button variant="outline" onClick={handleExport}>
                    <Download className="w-4 h-4 mr-2" />
                    Export
                </Button>
            </div>

            {/* Date Range Picker */}
            <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useCustomRange}
                            onChange={(e) => setUseCustomRange(e.target.checked)}
                            className="w-4 h-4 rounded"
                        />
                        <span>Use Custom Date Range</span>
                    </label>
                    {useCustomRange && (
                        <div className="flex items-center gap-2">
                            <FormInput
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                                className="w-40"
                            />
                            <span>to</span>
                            <FormInput
                                type="date"
                                value={dateRange.endDate}
                                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                                className="w-40"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Revenue</h3>
                        <DollarSign className="w-5 h-5 text-emerald-500" />
                    </div>
                    <p className="text-3xl font-bold">${(stats.totalRevenue / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">All time</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Monthly Revenue</h3>
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold">${(stats.monthlyRevenue / 100).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground mt-1">This month</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Total Bookings</h3>
                        <Ticket className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold">{stats.totalBookings}</p>
                    <p className="text-sm text-muted-foreground mt-1">All events</p>
                </div>

                <div className="p-6 border rounded-lg bg-card">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Upcoming Events</h3>
                        <Calendar className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold">{stats.upcomingEvents}</p>
                    <p className="text-sm text-muted-foreground mt-1">Scheduled</p>
                </div>
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Event Status Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Events by Status</h3>
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {statusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>

                {/* Event Mode Distribution */}
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Events by Mode</h3>
                    {modeData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={modeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {modeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            No data available
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Events Performance */}
            {stats.recentEvents && stats.recentEvents.length > 0 && (
                <div className="p-6 border rounded-lg bg-card">
                    <h3 className="text-lg font-semibold mb-4">Recent Events Performance</h3>
                    <div className="space-y-4">
                        {stats.recentEvents.map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                    <h4 className="font-semibold">{event.title}</h4>
                                    <p className="text-sm text-muted-foreground">
                                        {event.date} • {event.bookings} bookings
                                    </p>
                                </div>
                                <span
                                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                                        event.status === "published"
                                            ? "bg-green-500/10 text-green-500"
                                            : "bg-gray-500/10 text-gray-500"
                                    }`}
                                >
                                    {event.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

