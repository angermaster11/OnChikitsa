'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Screen from '../../_components/Screen';
import TopBar from '../../_components/TopBar';
import Stepper from '../../_components/Stepper';
import Toggle from '../../_components/Toggle';
import { Clock, Users, Calendar, Ban, CheckCircle } from '../../_components/icons';
import { tapLight } from '../../_lib/haptic';

function SettingRow({ icon, iconStyle, title, sub, control }) {
  return (
    <div className="set-row" style={{ cursor: 'default' }}>
      <span className="sr-ic" style={iconStyle}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted-fg)' }}>{sub}</div>
      </div>
      {control}
    </div>
  );
}

export default function SlotConfig() {
  const router = useRouter();

  const [slotMin, setSlotMin] = useState(15);
  const [breakMin, setBreakMin] = useState(5);
  const [maxPer, setMaxPer] = useState(2);
  const [advance, setAdvance] = useState(14);
  const [sameDay, setSameDay] = useState(true);
  const [bookingOn, setBookingOn] = useState(true);

  const save = () => { tapLight(); router.back(); };

  return (
    <Screen>
      <TopBar title="Slot Configuration" />
      <div className="content">
        <div className="section"><div className="section-head"><h2>Slot timing</h2></div></div>
        <div className="set-group">
          <SettingRow
            icon={<Clock size={18} />}
            title="Slot duration"
            sub="Length of each consultation slot"
            control={<Stepper value={slotMin} onChange={setSlotMin} min={5} max={60} step={5} suffix="min" />}
          />
          <SettingRow
            icon={<Clock size={18} />}
            title="Break between slots"
            sub="Buffer added after each slot"
            control={<Stepper value={breakMin} onChange={setBreakMin} min={0} max={30} step={5} suffix="min" />}
          />
          <SettingRow
            icon={<Users size={18} />}
            title="Max patients / slot"
            sub="Overbooking capacity per slot"
            control={<Stepper value={maxPer} onChange={setMaxPer} min={1} max={10} step={1} />}
          />
          <SettingRow
            icon={<Calendar size={18} />}
            title="Advance booking limit"
            sub="How far ahead patients can book"
            control={<Stepper value={advance} onChange={setAdvance} min={1} max={90} step={1} suffix="days" />}
          />
        </div>

        <div className="section"><div className="section-head"><h2>Booking</h2></div></div>
        <div className="set-group">
          <SettingRow
            icon={<Clock size={18} />}
            title="Same-day booking"
            sub="Allow patients to book for today"
            control={<Toggle on={sameDay} onChange={setSameDay} label="Same-day booking" />}
          />
          <SettingRow
            icon={bookingOn ? <CheckCircle size={18} /> : <Ban size={18} />}
            iconStyle={bookingOn
              ? { background: 'var(--accent-tint)', color: 'var(--accent-strong)' }
              : { background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)' }}
            title="Booking availability"
            sub={bookingOn ? 'Accepting new online bookings' : 'Online bookings paused'}
            control={<Toggle on={bookingOn} onChange={setBookingOn} label="Booking availability" />}
          />
        </div>

        <div className="pad" style={{ marginTop: 8 }}>
          <button className="btn btn-primary btn-block" onClick={save}>Save configuration</button>
        </div>
        <div style={{ height: 16 }} />
      </div>
    </Screen>
  );
}
