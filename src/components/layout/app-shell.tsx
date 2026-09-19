"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, Compass, GraduationCap, House, Layers3, Menu, Settings2, ShieldCheck, Sparkles, Target, X } from "lucide-react";
import { useApp } from "@/features/app-provider";
const nav = [{ href: "/", label: "Beranda", icon: House }, { href: "/learn/", label: "Jalur belajar", icon: Compass }, { href: "/problems/", label: "Bank soal", icon: Layers3 }, { href: "/practice/", label: "Latihan", icon: Target }, { href: "/progress/", label: "Progress", icon: ChartNoAxesCombined }, { href: "/reference/", label: "Referensi", icon: BookOpen }];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(), [open, setOpen] = useState(false), app = useApp();
  return <div className="app-shell"><a className="skip-link" href="#main-content">Lewati ke konten</a><aside className={`sidebar ${open ? "is-open" : ""}`} aria-label="Navigasi utama">
    <Link href="/" className="brand" onClick={() => setOpen(false)}><span className="brand-mark"><ChartNoAxesCombined size={22} strokeWidth={2.3} /></span>ModelMath<span className="brand-dot">.</span></Link>
    <button className="mobile-close icon-control" aria-label="Tutup navigasi" onClick={() => setOpen(false)}><X size={22} /></button>
    <p className="nav-caption">RUANG BELAJAR</p><nav>{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} className={`nav-link ${pathname === href || pathname === href.slice(0, -1) ? "active" : ""}`} onClick={() => setOpen(false)} aria-current={pathname === href ? "page" : undefined}><Icon size={19} /><span>{label}</span>{href === "/problems/" && <small>5k</small>}</Link>)}</nav>
    <div className="nav-divider" /><p className="nav-caption">TANTANG DIRIMU</p><nav><Link className="nav-link" href="/daily/" onClick={() => setOpen(false)}><Sparkles size={19} />Tantangan harian</Link><Link className="nav-link" href="/assessment/" onClick={() => setOpen(false)}><GraduationCap size={19} />Asesmen awal</Link><Link className="nav-link" href="/mistakes/" onClick={() => setOpen(false)}><BookOpen size={19} />Tinjau kesalahan</Link></nav>
    <div className="sidebar-bottom"><div className="local-note"><ShieldCheck size={20} /><div><strong>Belajar milikmu.</strong><p>Progress tersimpan di perangkat ini.</p></div></div><Link className="nav-link" href="/settings/" onClick={() => setOpen(false)}><Settings2 size={19} />Pengaturan</Link><Link className="profile" href="/progress/" onClick={() => setOpen(false)}><span className="avatar">P</span><span><strong>Pelajar mandiri</strong><small>Level {app.progress.unlockedLevel} · Terus bertumbuh</small></span><ArrowUpRight size={17} /></Link></div>
  </aside>{open && <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="Tutup menu" />}
  <div className="main-shell"><header className="topbar"><button className="mobile-menu icon-control" aria-label="Buka navigasi" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button><span className="breadcrumb">Ruang belajar <span>/</span> <strong>{nav.find(n => pathname === n.href || pathname === n.href.slice(0, -1))?.label ?? "Eksplorasi"}</strong></span><div className="topbar-right"><span className="device-indicator"><span />Tanpa akun. Fokus belajar.</span><Link href="/guide/" className="help-link">Panduan <ArrowUpRight size={14} /></Link></div></header>
  {app.error && <div className="global-error" role="alert">{app.error} <Link href="/settings/">Buka pengaturan & pemulihan</Link></div>}
  <main id="main-content" tabIndex={-1}>{children}</main><footer className="footer"><span>ModelMath · Dari masalah nyata ke keputusan yang tepat.</span><Link href="/about/">Tentang & privasi</Link></footer></div></div>;
}
