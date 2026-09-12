GLEMI – COMPLETE NEW SUPABASE SETUP

This package keeps the site connected to:
https://prsmnnqxzjfkcsoqzrdv.supabase.co

What GLEMI-COMPLETE-SETUP.sql restores/configures:
- Owner/Admin profile system restricted to the two approved emails
- Baltazar = Admin
- Glemiservices@gmail.com = Owner (automatically when that Auth user exists)
- Appointments and admin appointment management
- Working schedule: Mon-Sat 08:00-17:00, Sunday closed
- Public residential availability calendar tied to the admin schedule
- Booking capacity: limited at 3 bookings/day, unavailable at 5/day (front-end status logic)
- Booking time slots: 09:00, 10:00, 12:00, 14:00, 16:00
- Residential pricing in CAD, seeded from the estimator already in the website
- Admin pricing changes now flow to the public estimator
- WELCOME promo: 10% off first cleaning, one-time eligibility by email/phone
- Secure public RPCs for calendar, promo validation, and booking creation
- Site settings/contact email
- RLS policies

Run GLEMI-COMPLETE-SETUP.sql once in Supabase SQL Editor. It is idempotent and may be run again.

The public website does NOT expose an hourly rate.
