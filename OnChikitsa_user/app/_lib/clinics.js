'use client';

// Static clinic catalogue shared by the Explore list and the clinic detail
// screen. (Front-end demo data — wiring the real /clinics API + a booking
// endpoint is a later step.) `status` drives the badge + filter; `seats` is
// today's free slots. `glyph` keys into each screen's icon map; `g` picks a
// gradient class defined in both CSS modules.
export const CLINICS = [
  { id: 'c1', name: 'CityCare Multispeciality', cat: 'Multispeciality', area: 'Sector 18, Noida', dist: '2.1 km', rate: '4.9', reviews: '1,240', status: 'active', seats: 8, glyph: 'building', g: 'g1', phone: '+91 98100 11223', email: 'care@citycare.in', address: 'A-24, Sector 18, Noida, UP 201301', hours: 'Mon–Sat · 9:00 AM – 9:00 PM', about: 'A multispeciality clinic offering general medicine, cardiology and on-site diagnostics under one roof, with same-day appointments.' },
  { id: 'c2', name: 'Dr. Aisha Rao', cat: 'Cardiologist', area: 'MG Road, Noida', dist: '3.4 km', rate: '4.8', reviews: '980', status: 'active', seats: 5, glyph: 'heart', g: 'g5', phone: '+91 98200 44556', email: 'clinic@aisharao.in', address: '2nd Floor, MG Road, Noida, UP 201301', hours: 'Mon–Fri · 10:00 AM – 6:00 PM', about: 'Senior interventional cardiologist with 15+ years of experience in preventive heart care and ECG/2D-echo screening.' },
  { id: 'c3', name: 'Aarogya Dental Studio', cat: 'Dental', area: 'Sector 62, Noida', dist: '2.8 km', rate: '5.0', reviews: '120', status: 'booked', seats: 0, glyph: 'tooth', g: 'g2', phone: '+91 99100 77889', email: 'hello@aarogyadental.in', address: 'C-12, Sector 62, Noida, UP 201309', hours: 'Mon–Sun · 9:30 AM – 8:00 PM', about: 'Modern dental studio for cleaning, whitening, root canals and orthodontics with painless digital workflows.' },
  { id: 'c4', name: 'SkinGlow Dermatology', cat: 'Dermatology', area: 'Golf Course Rd', dist: '4.0 km', rate: '4.9', reviews: '85', status: 'active', seats: 3, glyph: 'sparkles', g: 'g4', phone: '+91 98300 22110', email: 'book@skinglow.in', address: 'Tower B, Golf Course Rd, Gurugram', hours: 'Tue–Sun · 11:00 AM – 7:00 PM', about: 'Clinical dermatology and cosmetology — acne, pigmentation, hair loss and laser treatments led by board-certified skin specialists.' },
  { id: 'c5', name: 'MindWell Clinic', cat: 'Psychiatry', area: 'Cyber Hub', dist: '3.2 km', rate: '4.8', reviews: '60', status: 'active', seats: 6, glyph: 'brain', g: 'g6', phone: '+91 98400 66332', email: 'care@mindwell.in', address: 'DLF Cyber Hub, Gurugram', hours: 'Mon–Sat · 10:00 AM – 8:00 PM', about: 'Confidential mental-health support — therapy, counselling and psychiatric consultation for anxiety, sleep and stress.' },
  { id: 'c6', name: 'LifeLine Diagnostics', cat: 'Lab & Diagnostics', area: 'Atta Market, Noida', dist: '1.9 km', rate: '4.7', reviews: '640', status: 'active', seats: 12, glyph: 'flask', g: 'g3', phone: '+91 98500 99001', email: 'reports@lifeline.in', address: 'Atta Market, Sector 27, Noida', hours: 'Daily · 7:00 AM – 10:00 PM', about: 'NABL-accredited pathology lab with home sample collection and 6-hour digital reports for 400+ tests.' },
  { id: 'c7', name: 'Sunrise Family Clinic', cat: 'Family Medicine', area: 'Park Street', dist: '1.6 km', rate: '4.7', reviews: '210', status: 'closed', seats: 0, glyph: 'stethoscope', g: 'g3', phone: '+91 98600 33221', email: 'front@sunrisefamily.in', address: 'Park Street, Kolkata', hours: 'Mon–Sat · 9:00 AM – 5:00 PM', about: 'Neighbourhood family practice for everyday illnesses, child health and routine check-ups. Currently closed — opens 9:00 AM.' },
  { id: 'c8', name: 'Wellness Point Polyclinic', cat: 'Polyclinic', area: 'Sector 15, Noida', dist: '1.1 km', rate: '4.6', reviews: '175', status: 'active', seats: 4, glyph: 'building', g: 'g6', phone: '+91 98700 45678', email: 'desk@wellnesspoint.in', address: 'Sector 15, Noida, UP 201301', hours: 'Mon–Sun · 8:00 AM – 9:00 PM', about: 'A friendly polyclinic bringing physicians, physiotherapy and dietetics together for whole-family wellness.' },
];

export function getClinic(id) {
  return CLINICS.find((c) => c.id === id) || null;
}
