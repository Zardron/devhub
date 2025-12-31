"use client";

import { useState } from "react";

const BookEvent = () => {
    const [submitted, setSubmitted] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleBookNow = async () => {
        setIsLoading(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
        setSubmitted(true);
    }

    return (
        <div id="book-event">
            {submitted ? (
                <div className="flex flex-col items-center gap-4 text-center py-4">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                        <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <p className="text-light-100 text-base font-medium">Thank you for booking your spot!</p>
                    <p className="text-light-200 text-sm">Your booking has been confirmed.</p>
                </div>
            ) : (
                <div>
                    <button
                        onClick={handleBookNow}
                        className="button-submit w-full"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Booking...
                            </span>
                        ) : (
                            'Book Now'
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}

export default BookEvent