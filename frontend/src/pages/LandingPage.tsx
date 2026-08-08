/**
 * SHEildAI — LandingPage
 *
 * The public-facing marketing page (previously App.tsx content).
 * Now a standalone component so App.tsx can handle routing.
 */

import { useState, useEffect, useRef } from 'react';
import {
  Shield, MapPin, Mic2, Siren, ArrowRight,
  ChevronRight, Menu, X, Lock, Zap, Globe,
  HeartHandshake, Phone
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────
   LIVE CLOCK
────────────────────────────────────────────────────────── */
function Clock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id); }, []);
  return <>{t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</>;
}

/* ──────────────────────────────────────────────────────────
   PREMIUM FEATURE CARD
────────────────────────────────────────────────────────── */
type FeatureCardProps = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  metric: string;
  metricLabel: string;
  fillPct: number;
  accentColor: string;
  dimColor: string;
  note: string;
  delay?: string;
};
function FeatureCard({ icon, eyebrow, title, body, metric, metricLabel, fillPct, accentColor, dimColor, note, delay = '' }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  const r = 22, cx = 28, cy = 28, circ = 2 * Math.PI * r;
  const dash = (fillPct / 100) * circ;

  return (
    <div
      className={`rise ${delay}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', borderRadius: '20px', padding: '1.5px',
        background: hovered
          ? `linear-gradient(145deg, ${accentColor}55 0%, ${accentColor}22 40%, transparent 70%)`
          : `linear-gradient(145deg, ${accentColor}28 0%, var(--color-stroke-hi) 50%, transparent 100%)`,
        boxShadow: hovered
          ? `0 0 0 1px ${accentColor}30, 0 24px 60px ${accentColor}18, 0 8px 24px rgba(0,0,0,0.6)`
          : '0 0 0 1px transparent, 0 8px 32px rgba(0,0,0,0.4)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.3s ease, background 0.3s ease',
        cursor: 'default', flexShrink: 0,
      }}
    >
      <div style={{
        borderRadius: '18.5px',
        background: `linear-gradient(160deg, var(--color-bg-surface) 0%, var(--color-bg-card) 60%, ${accentColor}08 100%)`,
        padding: '28px 26px 24px',
        display: 'flex', flexDirection: 'column', gap: '20px',
        height: '100%', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: `linear-gradient(90deg, transparent, ${accentColor}${hovered ? 'cc' : '44'}, transparent)`, transition: 'background 0.4s ease' }} />
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '140px', height: '140px', borderRadius: '50%', background: `radial-gradient(circle, ${accentColor}${hovered ? '18' : '0a'} 0%, transparent 70%)`, transition: 'background 0.4s ease', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', width: '56px', height: '56px', flexShrink: 0 }}>
            <svg width="56" height="56" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${accentColor}18`} strokeWidth="2.5" />
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} style={{ transition: 'stroke-dasharray 1s ease 0.3s' }} />
            </svg>
            <div style={{ position: 'absolute', inset: '10px', borderRadius: '50%', background: dimColor, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: hovered ? `0 0 14px ${accentColor}44` : 'none', transition: 'box-shadow 0.3s ease' }}>
              {icon}
            </div>
          </div>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}28`, padding: '4px 10px', borderRadius: '999px' }}>
            {eyebrow}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.035em', lineHeight: 1.15, color: 'var(--color-text-hi)' }}>{title}</h3>
          <p style={{ fontSize: '13px', lineHeight: '1.65', color: 'var(--color-text-md)', fontWeight: 400 }}>{body}</p>
        </div>

        <div style={{ borderRadius: '12px', background: `linear-gradient(135deg, ${accentColor}0d 0%, ${accentColor}05 100%)`, border: `1px solid ${accentColor}18`, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 900, color: accentColor, letterSpacing: '-0.05em', lineHeight: 1, textShadow: `0 0 24px ${accentColor}55` }}>{metric}</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-lo)', paddingBottom: '4px', letterSpacing: '0.04em' }}>{metricLabel}</span>
          </div>
          <div style={{ height: '3px', borderRadius: '2px', background: `${accentColor}18`, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${fillPct}%`, background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`, borderRadius: '2px', boxShadow: `0 0 8px ${accentColor}`, transition: 'width 1.2s cubic-bezier(0.22,1,0.36,1) 0.4s' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-lo)', paddingTop: '2px' }}>
          <Globe size={10} style={{ flexShrink: 0, color: accentColor, opacity: 0.6 }} />
          {note}
        </div>
      </div>
    </div>
  );
}

function TrustPill({ icon, label }: { icon: string; label: string }) {
  const [hov, setHov] = useState(false);
  return (
    <div className="rise" onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '7px 15px', borderRadius: '999px', fontSize: '12px', fontWeight: 500, background: hov ? 'var(--color-bg-surface)' : 'var(--color-bg-card)', border: `1px solid ${hov ? 'var(--color-pink)' : 'var(--color-stroke-hi)'}`, color: hov ? 'var(--color-text-hi)' : 'var(--color-text-md)', boxShadow: hov ? '0 0 14px var(--color-pink-glow)' : 'none', transition: 'all 0.2s ease', cursor: 'default' }}>
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 800, color: 'var(--color-pink)', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--color-text-lo)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   LANDING PAGE
────────────────────────────────────────────────────────── */
interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const [navOpen, setNavOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-root)', position: 'relative', overflow: 'hidden' }}>
      <div className="orb orb-pink" style={{ top: '-160px', left: '-120px', zIndex: 0 }} />
      <div className="orb orb-rose"  style={{ top: '60%', right: '-80px',  zIndex: 0 }} />
      <div className="orb orb-sos"  style={{ bottom: '10%', left: '30%', zIndex: 0 }} />
      <div className="dot-grid" style={{ position: 'absolute', inset: 0, opacity: 0.35, zIndex: 0, pointerEvents: 'none' }} />

      {/* NAVBAR */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid var(--color-stroke)', background: 'rgba(8,3,10,0.85)', backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '9px', flexShrink: 0, background: 'linear-gradient(135deg, var(--color-pink) 0%, var(--color-rose) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px var(--color-pink-glow)' }}>
              <Shield size={16} color="#08030a" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.03em', color: 'var(--color-text-hi)' }}>
              SHEild<span style={{ color: 'var(--color-pink)' }}>AI</span>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="hidden md:flex">
            {['How it works', 'Safety score', 'Cities', 'About'].map(l => (
              <a key={l} href="#" style={{ fontSize: '13px', color: 'var(--color-text-lo)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text-hi)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-lo)')}
              >{l}</a>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="hidden md:flex" style={{ alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-lo)' }}>
              <div className="live-dot" /><Clock />
            </div>
            <button
              className="hidden md:block focus-ring"
              onClick={onGetStarted}
              style={{ padding: '7px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--color-pink)', color: '#08030a', border: 'none', cursor: 'pointer', boxShadow: '0 0 20px var(--color-pink-glow)', transition: 'box-shadow 0.2s' }}
            >
              Get started
            </button>
            <button className="md:hidden focus-ring" onClick={() => setNavOpen(o => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-hi)' }}>
              {navOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {navOpen && (
          <div className="rise" style={{ padding: '16px 24px 20px', borderTop: '1px solid var(--color-stroke)', background: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {['How it works', 'Safety score', 'Cities', 'About'].map(l => (
              <a key={l} href="#" style={{ fontSize: '14px', color: 'var(--color-text-md)', textDecoration: 'none' }}>{l}</a>
            ))}
            <button onClick={onGetStarted} style={{ marginTop: '6px', padding: '10px', borderRadius: '10px', background: 'var(--color-pink)', color: '#08030a', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
              Get started
            </button>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '80px 24px 64px' }}>
        <div className="rise" style={{ marginBottom: '28px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '5px 13px', borderRadius: '999px', border: '1px solid var(--color-stroke-hi)', background: 'var(--color-bg-surface)', fontSize: '11px', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-pink-pale)', fontWeight: 500 }}>
            <HeartHandshake size={11} /> Women's safety platform · India
          </span>
        </div>

        <h1 className="rise d1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(44px, 7vw, 80px)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.0, color: 'var(--color-text-hi)', maxWidth: '820px', marginBottom: '20px' }}>
          Walk home.<br />
          <span className="shimmer-text">Without looking<br />over your shoulder.</span>
        </h1>

        <p className="rise d2" style={{ fontSize: '15px', lineHeight: '1.55', fontWeight: 400, color: 'var(--color-text-md)', maxWidth: '480px', marginBottom: '36px' }}>
          SHEildAI scores every street in real time, runs silent distress detection while you walk,
          and fires a full SOS cascade the moment something's wrong — even without signal.
        </p>

        <div className="rise d3" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '56px' }}>
          <button
            className="focus-ring"
            onClick={onGetStarted}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: 'var(--color-pink)', color: '#08030a', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 0 28px var(--color-pink-glow)', transition: 'transform 0.15s, box-shadow 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 0 40px var(--color-pink-glow)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 28px var(--color-pink-glow)'; }}
          >
            Get started free <ArrowRight size={14} strokeWidth={2.5} />
          </button>
          <button
            className="focus-ring"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '12px 22px', borderRadius: '10px', background: 'transparent', color: 'var(--color-text-md)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: '1px solid var(--color-stroke-hi)', transition: 'color 0.15s, border-color 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-hi)'; e.currentTarget.style.borderColor = 'var(--color-pink)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-md)'; e.currentTarget.style.borderColor = 'var(--color-stroke-hi)'; }}
          >
            <Phone size={13} /> See how it works <ChevronRight size={13} />
          </button>
        </div>

        <div className="rise d4" style={{ paddingTop: '28px', borderTop: '1px solid var(--color-stroke)', display: 'flex', flexWrap: 'wrap', gap: '36px' }}>
          <StatBlock value="2.4M+" label="incidents analyzed" />
          <StatBlock value="94%"   label="safe-route accuracy" />
          <StatBlock value="<3s"   label="distress detection" />
          <StatBlock value="0"     label="data sold. ever." />
        </div>
      </section>

      {/* TICKER */}
      <div style={{ position: 'relative', zIndex: 10, borderTop: '1px solid var(--color-stroke)', borderBottom: '1px solid var(--color-stroke)', padding: '10px 0', overflow: 'hidden', background: 'var(--color-bg-card)' }}>
        <div style={{ display: 'flex', gap: '48px', overflow: 'hidden' }}>
          {[
            '2.4M+ incidents analyzed','94% safe-route accuracy','<3s distress detection',
            'Works fully offline','Zero data sold','Built for Indian cities',
            'NGO & police integration','End-to-end encrypted',
            '2.4M+ incidents analyzed','94% safe-route accuracy','<3s distress detection',
            'Works fully offline','Zero data sold','Built for Indian cities',
          ].map((item, i) => (
            <span key={i} style={{ flexShrink: 0, fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)', whiteSpace: 'nowrap' }}>
              <span style={{ color: 'var(--color-pink)', marginRight: '10px' }}>✦</span>{item}
            </span>
          ))}
        </div>
      </div>

      {/* THREE PILLARS */}
      <section id="how" style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 64px' }}>
        <div className="rise" style={{ marginBottom: '8px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)' }}>
          Three layers of protection
        </div>
        <h2 className="rise d1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: '40px' }}>
          Not an app. A system.
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '16px' }}>
          <FeatureCard delay="d2" icon={<MapPin size={20} color="var(--color-pink)" />} eyebrow="01 · Predict" title="Know before you go." body="Every street gets a live risk score — pulled from crime reports, lighting data, time of day, and crowd density. The route you see isn't the fastest, it's the one you'll feel safe on." metric="94%" metricLabel="route safety accuracy" fillPct={94} accentColor="var(--color-pink)" dimColor="var(--color-pink-dim)" note="Live feed from 40+ city safety databases" />
          <FeatureCard delay="d3" icon={<Mic2 size={20} color="var(--color-rose)" />} eyebrow="02 · Protect" title="Running silent in the background." body="Guardian Mode doesn't need you to do anything. Your phone listens for sharp sound spikes, unusual motion, and velocity drops. If something's wrong, it knows first." metric="<3s" metricLabel="average distress recognition" fillPct={78} accentColor="var(--color-rose)" dimColor="var(--color-rose-dim)" note="On-device ML — nothing leaves your phone" />
          <FeatureCard delay="d4" icon={<Siren size={20} color="var(--color-sos)" className="sos-pulse" />} eyebrow="03 · Respond" title="SOS that actually reaches people." body="One hold. Trusted circle notified instantly. No reply in 90 seconds — nearby verified volunteers are pinged. Two minutes — emergency services get your live location." metric="90s" metricLabel="from tap to emergency alert" fillPct={62} accentColor="var(--color-sos)" dimColor="var(--color-sos-dim)" note="Works on 2G — queues offline when no signal" />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ position: 'relative', zIndex: 10, borderTop: '1px solid var(--color-stroke)', background: 'var(--color-bg-card)', padding: '28px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
          {[['🔒','End-to-end encrypted'],['📵','Offline SOS queue'],['🇮🇳','Built for India'],['🏛️','NGO & police API'],['🧠','On-device AI'],['🙈','Zero data sold'],['⚡','2G compatible']].map(([icon, label]) => (
            <TrustPill key={label} icon={icon} label={label} />
          ))}
        </div>
      </section>

      {/* SOS CASCADE TIMELINE */}
      <section style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '72px 24px 64px' }}>
        <div className="rise" style={{ marginBottom: '8px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-lo)' }}>SOS cascade timeline</div>
        <h2 className="rise d1" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,3.5vw,36px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: '36px' }}>Every second counts.</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {[
            { t: '0s',   label: 'SOS triggered',           detail: 'One hold on the button — or automatic from distress detection', color: 'var(--color-pink)' },
            { t: '5s',   label: 'Trusted circle alerted',  detail: 'Name, photo, live location sent via SMS + push to up to 5 contacts', color: 'var(--color-rose)' },
            { t: '90s',  label: 'Volunteer network pinged', detail: 'Nearest verified volunteer within 2km gets an alert', color: '#f97316' },
            { t: '2min', label: 'Emergency services',       detail: 'Local police receive live location + incident ID — works even if call drops', color: 'var(--color-sos)' },
          ].map((step, i) => (
            <div key={i} className={`rise d${i + 1}`} style={{ display: 'flex', gap: '20px', paddingBottom: i < 3 ? '28px' : '0', position: 'relative' }}>
              {i < 3 && <div style={{ position: 'absolute', left: '19px', top: '38px', width: '1px', bottom: '0', background: `linear-gradient(${step.color}66, transparent)` }} />}
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0, background: `${step.color}18`, border: `1.5px solid ${step.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: step.color }}>{step.t}</span>
              </div>
              <div style={{ paddingTop: '8px' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--color-text-hi)', marginBottom: '3px' }}>{step.label}</p>
                <p style={{ fontSize: '12px', color: 'var(--color-text-lo)', lineHeight: '1.5' }}>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* EMAIL CTA */}
      <section style={{ position: 'relative', zIndex: 10, padding: '0 24px 80px' }}>
        <div className="rise glass" style={{ maxWidth: '1100px', margin: '0 auto', borderRadius: '20px', padding: 'clamp(32px, 5vw, 60px)', background: 'linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-pink-dim) 100%)', border: '1px solid var(--color-stroke-hi)', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, var(--color-pink), var(--color-rose))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px var(--color-pink-glow)' }}>
              <Zap size={24} color="#08030a" strokeWidth={2.5} />
            </div>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(24px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: '12px' }}>
            Every night someone walks<br />home alone.
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-text-md)', maxWidth: '380px', margin: '0 auto 28px', lineHeight: '1.6' }}>
            We're rolling out city-by-city. Leave your email — we'll reach you when SHEildAI goes live near you.
          </p>

          {submitted ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: 'var(--color-safe-dim)', border: '1px solid var(--color-safe)', fontSize: '13px', color: 'var(--color-safe)', fontWeight: 600 }}>
              ✓ You're on the list. We'll be in touch.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', maxWidth: '400px', margin: '0 auto', flexWrap: 'wrap', justifyContent: 'center' }}>
              <input ref={emailRef} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="focus-ring"
                style={{ flex: '1', minWidth: '200px', padding: '11px 16px', borderRadius: '9px', fontSize: '13px', background: 'var(--color-bg-root)', border: '1px solid var(--color-stroke-hi)', color: 'var(--color-text-hi)', outline: 'none' }} />
              <button type="submit" className="focus-ring" style={{ padding: '11px 22px', borderRadius: '9px', background: 'var(--color-pink)', color: '#08030a', fontSize: '13px', fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 0 20px var(--color-pink-glow)', whiteSpace: 'nowrap' }}>
                Notify me
              </button>
            </form>
          )}

          <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-text-lo)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
            <Lock size={10} /> No spam. No data sold. Unsubscribe any time.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 10, borderTop: '1px solid var(--color-stroke)', padding: '18px 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--color-pink), var(--color-rose))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={12} color="#08030a" strokeWidth={2.5} />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '-0.02em' }}>SHEildAI</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-lo)' }}>© 2026</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--color-text-lo)' }}>
            <div className="live-dot" /><span>All systems operational</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
