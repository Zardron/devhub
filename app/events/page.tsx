import EventCard from "@/components/EventCard"
import { IEvent } from "@/database/event.model";
import { formatDateToReadable, formatTimeWithAMPM } from "@/lib/utils";
import AnimateOnScroll from "@/components/AnimateOnScroll";
import Image from "next/image";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const EventsPage = async () => {
    const response = await fetch(`${BASE_URL}/api/events`);
    const { events } = await response.json();

    const allEvents: IEvent[] = events || [];

    // Group events by date
    const eventsByDate = allEvents.reduce((acc: Record<string, IEvent[]>, event: IEvent) => {
        const date = event.date;
        if (!acc[date]) {
            acc[date] = [];
        }
        acc[date].push(event);
        return acc;
    }, {});

    // Sort dates
    const sortedDates = Object.keys(eventsByDate).sort((a, b) =>
        new Date(a).getTime() - new Date(b).getTime()
    );

    // Calculate unique locations
    const uniqueLocations = new Set(allEvents.map((e: IEvent) => e.location)).size;

    return (
        <section className="py-8">
            {/* Hero Header Section */}
            <AnimateOnScroll variant="fade">
                <div className="mb-16">
                    {/* Badge */}
                    <div className="text-center mb-8">
                        <div className="inline-block mb-6">
                            <div className="glass px-6 py-2 rounded-full border border-blue/30 backdrop-blur-xl">
                                <span className="text-blue text-sm font-medium flex items-center gap-2">
                                    <Image src="/icons/calendar.svg" alt="Calendar" width={16} height={16} />
                                    {allEvents.length} {allEvents.length === 1 ? 'Event' : 'Events'} Available
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Title */}
                    <div className="text-center mb-12">
                        <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
                            <span className="block mb-2">All Events</span>
                            <span className="block text-blue relative">
                                Discover & Connect
                                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-blue to-transparent opacity-60" />
                            </span>
                        </h1>
                        <p className="text-light-100 text-lg max-w-3xl mx-auto mb-6">
                            Discover all developer events happening around the world. Filter and explore to find the perfect event for you.
                        </p>
                        <p className="text-light-200 text-base max-w-3xl mx-auto">
                            From hackathons and conferences to workshops and meetups, our platform brings together the global developer community. Whether you're looking to learn new technologies, network with industry leaders, or showcase your projects, you'll find events that match your interests and schedule.
                        </p>
                    </div>

                    {/* Feature Highlights */}
                    <AnimateOnScroll delay={100} variant="fade">
                        <div className="max-w-5xl mx-auto">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="glass p-6 rounded-xl border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                                            <Image src="/icons/calendar.svg" alt="Calendar" width={20} height={20} />
                                        </div>
                                        <h3 className="text-lg font-semibold">Diverse Formats</h3>
                                    </div>
                                    <p className="text-light-200 text-sm leading-relaxed">
                                        Join online, offline, or hybrid events. Attend from anywhere in the world or connect in person with your local developer community.
                                    </p>
                                </div>

                                <div className="glass p-6 rounded-xl border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                                            <Image src="/icons/audience.svg" alt="Audience" width={20} height={20} />
                                        </div>
                                        <h3 className="text-lg font-semibold">Expert Speakers</h3>
                                    </div>
                                    <p className="text-light-200 text-sm leading-relaxed">
                                        Learn from industry leaders, tech innovators, and experienced developers sharing their knowledge and insights.
                                    </p>
                                </div>

                                <div className="glass p-6 rounded-xl border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                                            <Image src="/icons/mode.svg" alt="Network" width={20} height={20} />
                                        </div>
                                        <h3 className="text-lg font-semibold">Networking</h3>
                                    </div>
                                    <p className="text-light-200 text-sm leading-relaxed">
                                        Connect with like-minded developers, potential collaborators, and expand your professional network.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </AnimateOnScroll>

                    {/* Additional Info */}
                    {allEvents.length > 0 && (
                        <AnimateOnScroll delay={200} variant="fade">
                            <div className="mt-10 text-center">
                                <div className="glass p-6 rounded-xl border border-blue/10 max-w-3xl mx-auto">
                                    <p className="text-light-100 text-base leading-relaxed">
                                        Browse through our curated collection of events organized by leading tech companies, developer communities, and educational institutions. Each event includes detailed information about the agenda, speakers, venue, and registration process to help you make informed decisions.
                                    </p>
                                </div>
                            </div>
                        </AnimateOnScroll>
                    )}
                </div>
            </AnimateOnScroll>

            {/* Events List */}
            {allEvents.length === 0 ? (
                <AnimateOnScroll variant="fade">
                    <div className="text-center py-24">
                        <div className="inline-block mb-6 p-6 rounded-full bg-blue/10">
                            <Image src="/icons/calendar.svg" alt="Empty" width={48} height={48} className="opacity-50" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4">No Events Available</h2>
                        <p className="text-light-200 text-lg mb-2">We're currently updating our event calendar.</p>
                        <p className="text-light-200">Check back soon for exciting developer events!</p>
                    </div>
                </AnimateOnScroll>
            ) : (
                <div className="space-y-20">
                    {sortedDates.map((date, dateIndex) => (
                        <AnimateOnScroll key={date} variant="fade" delay={dateIndex * 100}>
                            <div className="space-y-8">
                                {/* Date Header */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-6 border-b border-border-dark/50">
                                    <div className="flex items-center gap-4">
                                        <div className="w-1 h-12 bg-gradient-to-b from-blue to-blue/30 rounded-full" />
                                        <div>
                                            <h2 className="text-3xl font-bold mb-1">
                                                {formatDateToReadable(date)}
                                            </h2>
                                            <p className="text-light-200 text-sm">
                                                {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="ml-auto flex items-center gap-3">
                                        <div className="glass px-4 py-2 rounded-full border border-blue/20">
                                            <span className="text-blue font-semibold text-sm">
                                                {eventsByDate[date].length} {eventsByDate[date].length === 1 ? 'event' : 'events'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Events Grid */}
                                <ul className="events">
                                    {eventsByDate[date].map((event: IEvent, eventIndex: number) => (
                                        <li key={event.slug}>
                                            <AnimateOnScroll delay={eventIndex * 50} variant="scale">
                                                <div className="hover:scale-[1.02] transition-transform duration-300">
                                                    <EventCard {...event} />
                                                </div>
                                            </AnimateOnScroll>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </AnimateOnScroll>
                    ))}
                </div>
            )}

            {/* Enhanced Summary Section */}
            {allEvents.length > 0 && (
                <AnimateOnScroll variant="glow" delay={200}>
                    <div className="mt-24 glass p-10 rounded-2xl border border-blue/20 hover:border-blue/40 transition-all duration-300">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold mb-3">Event Statistics</h2>
                            <p className="text-light-200">A comprehensive overview of our event calendar</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="text-center p-6 rounded-xl bg-dark-100/50 border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                <div className="inline-block p-4 rounded-full bg-blue/10 mb-4">
                                    <Image src="/icons/calendar.svg" alt="Events" width={32} height={32} />
                                </div>
                                <p className="text-4xl font-bold text-blue mb-2">{allEvents.length}</p>
                                <p className="text-light-200 font-medium">Total Events</p>
                                <p className="text-light-200 text-xs mt-2 opacity-70">Across all dates</p>
                            </div>
                            <div className="text-center p-6 rounded-xl bg-dark-100/50 border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                <div className="inline-block p-4 rounded-full bg-blue/10 mb-4">
                                    <Image src="/icons/clock.svg" alt="Dates" width={32} height={32} />
                                </div>
                                <p className="text-4xl font-bold text-blue mb-2">{sortedDates.length}</p>
                                <p className="text-light-200 font-medium">Event Dates</p>
                                <p className="text-light-200 text-xs mt-2 opacity-70">Unique dates scheduled</p>
                            </div>
                            <div className="text-center p-6 rounded-xl bg-dark-100/50 border border-blue/10 hover:border-blue/30 transition-all duration-300">
                                <div className="inline-block p-4 rounded-full bg-blue/10 mb-4">
                                    <Image src="/icons/pin.svg" alt="Locations" width={32} height={32} />
                                </div>
                                <p className="text-4xl font-bold text-blue mb-2">{uniqueLocations}</p>
                                <p className="text-light-200 font-medium">Locations</p>
                                <p className="text-light-200 text-xs mt-2 opacity-70">Cities worldwide</p>
                            </div>
                        </div>
                    </div>
                </AnimateOnScroll>
            )}
        </section>
    )
}

export default EventsPage

