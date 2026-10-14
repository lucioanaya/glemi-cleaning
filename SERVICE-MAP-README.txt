GLEMI SERVICE MAP — Setup / use

1. Upload this entire ZIP to the same GitHub repository as the current GLEMI website, replacing existing files.
2. Open the admin panel and choose Service Map in the left navigation. On mobile, tap More > Service Map.
3. Pending and confirmed bookings appear in the list. Cancelled bookings are excluded.
4. Tap Locate address on each booking to look it up, one at a time. Successful lookups are saved in that browser only and shown as map pins.
5. Tap Directions to open Google Maps. Verify approximate locations before travelling.

The map uses OpenStreetMap/Leaflet. Each manual address lookup sends the address to OpenStreetMap Nominatim; no background/bulk lookup is performed. Coordinates are cached in that admin browser, not in Supabase, so other browsers must locate them separately. Employee locations and automatic distance assignment are not part of this phase.

Map view: limited to Metro Vancouver (Vancouver, Burnaby, Richmond, Surrey, Coquitlam, Langley and surrounding cities). The map opens focused on the service area rather than all of British Columbia. Addresses outside the regional bounds are not placed as markers.
