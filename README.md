# TechHub - Tech Event Management Platform

A modern, full-stack platform for discovering, managing, and attending tech events worldwide. TechHub connects developers, innovators, and tech enthusiasts with hackathons, conferences, workshops, and more.

## 🚀 Features

### For Users
- **Event Discovery**: Browse and search through hundreds of tech events
- **Event Booking**: One-click booking system for event registration
- **Event Filtering**: Filter events by location, date, format (Virtual/Onsite/Hybrid), and tags
- **User Dashboard**: View your bookings and manage your profile
- **Newsletter**: Subscribe to stay updated with the latest events
- **Appeals System**: Appeal account bans with detailed reasoning

### For Organizers
- **Event Management**: Create and manage your events
- **Organizer Dashboard**: Track your events and attendees
- **User Management**: Manage users associated with your organization

### For Administrators
- **Comprehensive Dashboard**: Analytics and statistics with interactive charts
- **User Management**: Manage all users, including ban/unban functionality
- **Event Management**: Create, edit, and delete events
- **Organizer Management**: Manage event organizers and their associations
- **Appeals Review**: Review and respond to user ban appeals
- **Statistics**: View growth trends, role distributions, and event mode analytics

## 🛠️ Tech Stack

### Frontend
- **Next.js 16.1.1** - React framework with App Router
- **React 19.2.3** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible component primitives
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **Recharts** - Data visualization
- **Sonner & React Hot Toast** - Toast notifications
- **next-themes** - Dark mode support

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Cloudinary** - Image hosting and management

### Development Tools
- **ESLint** - Code linting
- **TypeScript** - Static type checking

## 📁 Project Structure

```
devhub/
├── app/                      # Next.js App Router
│   ├── admin-dashboard/     # Admin dashboard pages
│   ├── api/                  # API routes
│   │   ├── admin/           # Admin API endpoints
│   │   ├── appeals/         # Appeals API
│   │   ├── auth/            # Authentication API
│   │   ├── bookings/        # Booking API
│   │   ├── events/          # Events API
│   │   └── newsletter/      # Newsletter API
│   ├── events/              # Event pages
│   ├── bookings/            # User bookings page
│   ├── sign-in/             # Sign in page
│   ├── sign-up/             # Sign up page
│   └── layout.tsx           # Root layout
├── components/              # React components
│   ├── admin-dashboard/    # Admin-specific components
│   ├── ui/                 # Reusable UI components
│   └── providers/          # Context providers
├── database/               # MongoDB models
│   ├── user.model.ts       # User schema
│   ├── event.model.ts      # Event schema
│   ├── booking.model.ts    # Booking schema
│   ├── organizer.model.ts  # Organizer schema
│   ├── appeal.model.ts     # Appeal schema
│   └── newsletter.model.ts # Newsletter schema
├── lib/                    # Utility functions and configurations
│   ├── hooks/             # Custom React hooks
│   │   └── api/           # API query hooks
│   ├── store/             # Zustand stores
│   ├── auth.ts            # Authentication utilities
│   ├── mongodb.ts         # MongoDB connection
│   └── cloudinary.ts      # Cloudinary configuration
└── public/                # Static assets
```
