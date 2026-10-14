GLEMI Geoapify integration
Replace three files at the ROOT of GitHub repository lucioanaya/glemi-cleaning:
- employees.js
- service-map.js
- admin.html

Prerequisite: Supabase Edge Function glemi-geoapify deployed and GEOAPIFY_API_KEY set in SAME Supabase project as supabase-config.js.
Sign in to GLEMI admin. Use Employees to save an employee address, and Service Map -> Find address for bookings.
Geocoding and routing calls use the authenticated Supabase session. If Geoapify fails, existing BC address geocoder remains a fallback for geocoding. The route calculation is approximate and not live traffic.
The files do NOT contain API keys. Back up the three original files or use GitHub history to revert.
