"use client";

import { useState } from "react";

const BookEvent = () => {
    const [email, setEmail] = useState<string>('');
    const [submitted, setSubmitted] = useState<boolean>(false);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitted(true);
    }

    return (
        <div id="book-event">
            {submitted ? (
                <p>Thank you for booking your spot. We will send you an email confirmation shortly.</p>
            ) : (
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="email">Email Address</label>
                        <input type="email" id="email" name="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <button type="submit" className="button-submit">Submit</button>
                    </div>
                </form>
            )}
        </div>
    )
}

export default BookEvent