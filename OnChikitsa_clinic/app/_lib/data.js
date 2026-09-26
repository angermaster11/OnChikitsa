'use client';

// ── Mock data for the clinic app (UI-level; no backend) ─────────────────────
// Realistic Indian clinic content. Import what you need:  import { DOCTORS } from '@/…/data'

export const CLINIC = {
  name: 'Sunrise Family Clinic',
  type: 'Multispeciality',
  owner: 'Dr. Anjali Mehta',
  phone: '+91 98765 43210',
  email: 'care@sunriseclinic.in',
  address: '2nd Floor, MG Road, Sector 18',
  city: 'Noida',
  state: 'Uttar Pradesh',
  pincode: '201301',
  about: 'A trusted neighbourhood multispeciality clinic offering general, dental and pediatric care with same-day appointments.',
  rating: 4.8,
  reviews: 214,
  verified: true,
  hours: 'Mon–Sat · 9:00 AM – 8:00 PM',
};

export const DOCTORS = [
  { id: 'd1', name: 'Dr. Rahul Sharma', spec: 'Cardiologist', qual: 'MBBS, MD (Cardiology)', exp: '12 yrs', reg: 'MCI-45213', fee: 800, phone: '+91 98110 22334', email: 'rahul.sharma@sunrise.in', active: true, rating: 4.9, appts: 1284 },
  { id: 'd2', name: 'Dr. Neha Kapoor', spec: 'Dermatologist', qual: 'MBBS, MD (Dermatology)', exp: '8 yrs', reg: 'MCI-51820', fee: 700, phone: '+91 98200 55667', email: 'neha.kapoor@sunrise.in', active: true, rating: 4.8, appts: 942 },
  { id: 'd3', name: 'Dr. Arjun Nair', spec: 'Pediatrician', qual: 'MBBS, DCH', exp: '15 yrs', reg: 'MCI-33110', fee: 600, phone: '+91 99000 11223', email: 'arjun.nair@sunrise.in', active: true, rating: 4.9, appts: 1760 },
  { id: 'd4', name: 'Dr. Sara Iyer', spec: 'Dentist', qual: 'BDS, MDS', exp: '6 yrs', reg: 'DCI-77420', fee: 500, phone: '+91 97400 88991', email: 'sara.iyer@sunrise.in', active: false, rating: 4.7, appts: 610 },
  { id: 'd5', name: 'Dr. Vikram Singh', spec: 'Orthopedician', qual: 'MBBS, MS (Ortho)', exp: '10 yrs', reg: 'MCI-29008', fee: 900, phone: '+91 98999 33445', email: 'vikram.singh@sunrise.in', active: true, rating: 4.6, appts: 823 },
];

export const SERVICES = [
  { id: 's1', name: 'General Consultation', desc: 'Standard OPD consultation', fee: 500, mins: 15, gst: 0, active: true },
  { id: 's2', name: 'Follow-up Visit', desc: 'Within 7 days of a consultation', fee: 300, mins: 10, gst: 0, active: true },
  { id: 's3', name: 'Dental Consultation', desc: 'Oral exam + advice', fee: 700, mins: 20, gst: 5, active: true },
  { id: 's4', name: 'Cardiac Check-up', desc: 'ECG + review', fee: 1200, mins: 30, gst: 5, active: true },
  { id: 's5', name: 'Child Wellness', desc: 'Growth + vaccination review', fee: 600, mins: 20, gst: 0, active: false },
];

export const APPOINTMENTS = [
  { id: 'A-102', patient: 'Rahul Kumar', phone: '+91 98765 10101', doctor: 'Dr. Rahul Sharma', service: 'Cardiac Check-up', date: '2026-09-23', time: '10:30 AM', token: 'A-12', status: 'confirmed', pay: 'paid', amount: 1200, tab: 'today' },
  { id: 'A-103', patient: 'Priya Menon', phone: '+91 90000 20202', doctor: 'Dr. Neha Kapoor', service: 'General Consultation', date: '2026-09-23', time: '11:00 AM', token: 'A-13', status: 'arrived', pay: 'paid', amount: 500, tab: 'today' },
  { id: 'A-104', patient: 'Amit Verma', phone: '+91 91111 30303', doctor: 'Dr. Arjun Nair', service: 'Child Wellness', date: '2026-09-23', time: '11:30 AM', token: 'A-14', status: 'consulting', pay: 'pay_at_clinic', amount: 600, tab: 'today' },
  { id: 'A-105', patient: 'Neha Gupta', phone: '+91 92222 40404', doctor: 'Dr. Rahul Sharma', service: 'Follow-up Visit', date: '2026-09-24', time: '09:45 AM', token: 'A-02', status: 'confirmed', pay: 'paid', amount: 300, tab: 'upcoming' },
  { id: 'A-106', patient: 'Suresh Rao', phone: '+91 93333 50505', doctor: 'Dr. Vikram Singh', service: 'General Consultation', date: '2026-09-24', time: '05:15 PM', token: 'A-08', status: 'pending', pay: 'pending', amount: 900, tab: 'upcoming' },
  { id: 'A-098', patient: 'Kavya Shah', phone: '+91 94444 60606', doctor: 'Dr. Neha Kapoor', service: 'Dental Consultation', date: '2026-09-22', time: '04:00 PM', token: 'A-19', status: 'completed', pay: 'paid', amount: 700, tab: 'completed' },
  { id: 'A-097', patient: 'Manish Jain', phone: '+91 95555 70707', doctor: 'Dr. Arjun Nair', service: 'General Consultation', date: '2026-09-22', time: '12:15 PM', token: 'A-11', status: 'cancelled', pay: 'refunded', amount: 500, tab: 'cancelled' },
];

export const QUEUE = {
  consulting: { token: 'A-14', patient: 'Amit Verma', doctor: 'Dr. Arjun Nair', startedAt: '11:12 AM' },
  waiting: [
    { token: 'A-15', patient: 'Sunita Yadav', doctor: 'Dr. Neha Kapoor', time: '11:30 AM' },
    { token: 'A-16', patient: 'Priya Menon', doctor: 'Dr. Rahul Sharma', time: '11:45 AM' },
    { token: 'A-17', patient: 'Rohit Malhotra', doctor: 'Dr. Vikram Singh', time: '12:00 PM' },
    { token: 'A-18', patient: 'Deepa Nair', doctor: 'Dr. Arjun Nair', time: '12:15 PM' },
  ],
};

export const PATIENTS = [
  { id: 'p1', name: 'Rahul Kumar', phone: '+91 98765 10101', gender: 'Male', age: 34, lastVisit: '20 Sep 2026', visits: 5 },
  { id: 'p2', name: 'Priya Menon', phone: '+91 90000 20202', gender: 'Female', age: 28, lastVisit: '18 Sep 2026', visits: 3 },
  { id: 'p3', name: 'Amit Verma', phone: '+91 91111 30303', gender: 'Male', age: 6, lastVisit: '23 Sep 2026', visits: 8 },
  { id: 'p4', name: 'Neha Gupta', phone: '+91 92222 40404', gender: 'Female', age: 41, lastVisit: '12 Sep 2026', visits: 2 },
  { id: 'p5', name: 'Suresh Rao', phone: '+91 93333 50505', gender: 'Male', age: 52, lastVisit: '02 Sep 2026', visits: 11 },
  { id: 'p6', name: 'Kavya Shah', phone: '+91 94444 60606', gender: 'Female', age: 23, lastVisit: '22 Sep 2026', visits: 1 },
];

export const PAYMENTS = [
  { id: 'PY-5012', appt: 'A-102', patient: 'Rahul Kumar', amount: 1200, fee: 24, gst: 60, net: 1116, method: 'online', status: 'success', refund: null, date: '23 Sep · 10:32 AM' },
  { id: 'PY-5011', appt: 'A-098', patient: 'Kavya Shah', amount: 700, fee: 14, gst: 35, net: 651, method: 'online', status: 'success', refund: null, date: '22 Sep · 04:05 PM' },
  { id: 'PY-5010', appt: 'A-104', patient: 'Amit Verma', amount: 600, fee: 0, gst: 0, net: 600, method: 'cash', status: 'pending', refund: null, date: '23 Sep · 11:20 AM' },
  { id: 'PY-5009', appt: 'A-097', patient: 'Manish Jain', amount: 500, fee: 10, gst: 25, net: 465, method: 'online', status: 'refunded', refund: 'full', date: '22 Sep · 12:40 PM' },
];

export const SETTLEMENTS = [
  { id: 'ST-2209', amount: 42800, date: '22 Sep 2026', status: 'settled', count: 38 },
  { id: 'ST-2208', amount: 51200, date: '15 Sep 2026', status: 'settled', count: 46 },
  { id: 'ST-2207', amount: 38650, date: '08 Sep 2026', status: 'settled', count: 33 },
  { id: 'ST-2210', amount: 24800, date: '29 Sep 2026', status: 'processing', count: 21 },
];

export const EARNINGS = {
  today: 24800, week: 142000, month: 584000,
  chart: [ { d: 'Mon', v: 38 }, { d: 'Tue', v: 52 }, { d: 'Wed', v: 44 }, { d: 'Thu', v: 61 }, { d: 'Fri', v: 48 }, { d: 'Sat', v: 72 }, { d: 'Sun', v: 25 } ],
  byDoctor: [ { name: 'Dr. Rahul Sharma', v: 186000 }, { name: 'Dr. Arjun Nair', v: 152000 }, { name: 'Dr. Neha Kapoor', v: 128000 }, { name: 'Dr. Vikram Singh', v: 118000 } ],
  byService: [ { name: 'General Consultation', v: 210000 }, { name: 'Cardiac Check-up', v: 156000 }, { name: 'Dental Consultation', v: 118000 }, { name: 'Follow-up', v: 100000 } ],
  online: 412000, cash: 172000,
};

export const REVIEWS = {
  overall: 4.8, total: 214,
  dist: [ { s: 5, n: 168 }, { s: 4, n: 32 }, { s: 3, n: 9 }, { s: 2, n: 3 }, { s: 1, n: 2 } ],
  items: [
    { id: 'r1', patient: 'Rahul Kumar', stars: 5, doctor: 'Dr. Rahul Sharma', date: '20 Sep', text: 'Very thorough consultation and hardly any wait. The token queue was smooth.', reply: null },
    { id: 'r2', patient: 'Priya Menon', stars: 4, doctor: 'Dr. Neha Kapoor', date: '18 Sep', text: 'Good experience overall, clinic is clean and staff is polite.', reply: 'Thank you Priya! See you at your follow-up.' },
    { id: 'r3', patient: 'Suresh Rao', stars: 5, doctor: 'Dr. Vikram Singh', date: '15 Sep', text: 'Dr. Singh explained my knee issue clearly. Highly recommend.', reply: null },
  ],
};

export const NOTIFICATIONS = [
  { id: 'n1', type: 'appointment', title: 'New appointment booked', body: 'Priya Menon booked General Consultation for 11:00 AM.', time: '2m ago', unread: true },
  { id: 'n2', type: 'arrived', title: 'Patient arrived', body: 'Amit Verma (A-14) has checked in.', time: '12m ago', unread: true },
  { id: 'n3', type: 'payment', title: 'Payment received', body: '₹1,200 received from Rahul Kumar (online).', time: '1h ago', unread: false },
  { id: 'n4', type: 'cancel', title: 'Appointment cancelled', body: 'Manish Jain cancelled A-097. Refund initiated.', time: '3h ago', unread: false },
  { id: 'n5', type: 'reschedule', title: 'Appointment rescheduled', body: 'Neha Gupta moved to 24 Sep, 09:45 AM.', time: '5h ago', unread: false },
  { id: 'n6', type: 'settlement', title: 'Settlement processed', body: '₹42,800 settled to your bank account.', time: 'Yesterday', unread: false },
  { id: 'n7', type: 'system', title: 'Verification approved', body: 'Your clinic documents were verified successfully.', time: '2d ago', unread: false },
];

export const CLINIC_TYPES = ['General', 'Multispeciality', 'Dental', 'Eye Care', 'Pediatric', 'Skin & Hair', 'Orthopedic', 'ENT'];
export const SPECIALIZATIONS = ['Cardiologist', 'Dermatologist', 'Pediatrician', 'Dentist', 'Orthopedician', 'General Physician', 'ENT Specialist', 'Ophthalmologist', 'Gynecologist'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Status → { label, class } for the .badge helper
export const STATUS = {
  confirmed: { label: 'Confirmed', cls: 'badge-info' },
  pending: { label: 'Pending', cls: 'badge-warning' },
  arrived: { label: 'Arrived', cls: 'badge-success' },
  consulting: { label: 'Consulting', cls: 'badge-info' },
  completed: { label: 'Completed', cls: 'badge-success' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  paid: { label: 'Paid', cls: 'badge-success' },
  pay_at_clinic: { label: 'Pay at clinic', cls: 'badge-warning' },
  refunded: { label: 'Refunded', cls: 'badge-muted' },
  success: { label: 'Success', cls: 'badge-success' },
};

export function findAppt(id) { return APPOINTMENTS.find((a) => a.id === id) || APPOINTMENTS[0]; }
export function findDoctor(id) { return DOCTORS.find((d) => d.id === id) || DOCTORS[0]; }
export function findPatient(id) { return PATIENTS.find((p) => p.id === id) || PATIENTS[0]; }
export function findService(id) { return SERVICES.find((s) => s.id === id) || null; }
export function findPayment(id) { return PAYMENTS.find((p) => p.id === id) || PAYMENTS[0]; }
export const rupee = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

