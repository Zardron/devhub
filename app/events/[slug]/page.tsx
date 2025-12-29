import { notFound } from "next/navigation";
import Image from "next/image";
import BookEvent from "@/components/BookEvent";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const EventDetailItem = ({ icon, alt, label }: { icon: string, alt: string, label: string }) => {
    return (
        <div className="flex flex-row gap-2 items-center">
            <Image src={icon} alt={alt} width={14} height={14} />
            <p className="text-light-200 text-sm font-light">{label}</p>
        </div>
    )
}

const EventAgendaItem = ({ agendaItems }: { agendaItems: string[] }) => {
    return (
        <div className="agenda">
            <h2>Agenda</h2>
            <ul>
                {agendaItems.map((item, index) => (
                    <li key={index}>
                        <p className="text-light-200 text-sm font-light">{item}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

const EventTags = ({ tags }: { tags: string[] }) => {
    return (
        <div className="flex flex-row gap-1.5 flex-wrap items-center">
            {tags.map((tag, index) => (
                <div key={index}>
                    <p className="pill">{tag}</p>
                </div>
            ))}
        </div>
    )
}

const EventDetailsPage = async ({ params }: { params: Promise<{ slug: string }> }) => {
    const { slug } = await params;
    const request = await fetch(`${BASE_URL}/api/events/${slug}`);
    const { event: { title, description, overview, image, venue, location, date, time, mode, audience, agenda, organizer, tags } } = await request.json();

    if (!description) {
        return notFound();
    }

    const bookings: number = 10;

    return (
        <section id="event">
            <div className="header">
                <h1>Event Description</h1>
                <p>{description}</p>
            </div>

            <div className="details">
                {/* Event Content */}
                <div className="content">
                    <Image src={image} alt={title} width={800} height={450} className="banner" priority />

                    <section className="flex-col gap-2">
                        <h2>Overview</h2>
                        <p>{overview}</p>
                    </section>

                    <section className="flex-col gap-2">
                        <h2>Event Details</h2>
                        <EventDetailItem icon="/icons/calendar.svg" alt="Date" label={date} />
                        <EventDetailItem icon="/icons/clock.svg" alt="Time" label={time} />
                        <EventDetailItem icon="/icons/pin.svg" alt="Pin" label={location} />
                        <EventDetailItem icon="/icons/mode.svg" alt="Mode" label={mode} />
                        <EventDetailItem icon="/icons/audience.svg" alt="Audience" label={audience} />
                    </section>

                    <EventAgendaItem agendaItems={JSON.parse(agenda[0])} />

                    <section className="flex-col gap-2">
                        <h2>About the Organizer</h2>
                        <p>{organizer}</p>
                    </section>

                    <EventTags tags={JSON.parse(tags[0])} />
                </div>

                {/* Booking Content */}
                <aside className="booking">
                    <div className="signup-card">
                        <h2>Book Your Spot</h2>
                        {bookings > 0 ? (
                            <p className="text-sm">
                                {bookings} {bookings === 1 ? 'person has' : 'people have'} already booked.
                            </p>
                        ) : (
                            <p className="text-sm">Be the first to book your spot.</p>
                        )}
                        <BookEvent />
                    </div>
                </aside>
            </div>
        </section>
    )
}

export default EventDetailsPage