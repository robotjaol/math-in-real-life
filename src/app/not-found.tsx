import Link from "next/link";
export default function NotFound() { return <div className="page"><p className="eyebrow">404</p><h1>Halaman tidak ditemukan</h1><p>Alamat ini tidak termasuk dalam ruang belajar ModelMath.</p><Link className="button button-primary" href="/learn/">Kembali ke jalur belajar</Link></div>; }
