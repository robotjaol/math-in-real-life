"use client";
import { useState } from "react";
import Link from "next/link";
import katex from "katex";
import { ArrowRight } from "lucide-react";
import formulas from "@/data/formulas.json";
import { PageHeader } from "./catalog";
import { Button } from "@/components/ui/button";
const guide = [
  ["Pahami tujuan nyata","Tuliskan besaran atau keputusan yang dibutuhkan. Apa yang berubah setelah mengetahui hasilnya?"],
  ["Identifikasi variabel","Pisahkan variabel known, unknown, dan derived. Beri simbol dan satuan yang konsisten."],
  ["Ekstrak data","Catat nilai, unit, tabel, graph, constraint, dan periode pengukuran."],
  ["Klasifikasikan relevansi","Bedakan data wajib, opsional, dan distractor. Jelaskan mengapa suatu data digunakan."],
  ["Normalisasi satuan","Konversi waktu, panjang, biaya, atau persentase sebelum menggabungkan nilai dalam model."],
  ["Definisikan asumsi","Nyatakan kondisi yang membuat model dapat diselesaikan. Asumsi harus eksplisit dan dapat diperiksa."],
  ["Bangun model matematika","Bentuk equation, fungsi, probability model, network, optimasi, atau simulasi."],
  ["Pilih metode","Bandingkan ketepatan, biaya perhitungan, dan keterbatasan metode. Jelaskan mengapa cocok."],
  ["Hitung","Simpan intermediate result dan kebijakan pembulatan agar hasil bisa direproduksi."],
  ["Validasi","Periksa unit, tanda, skala, batas, feasibility, dan kesesuaian dengan estimasi."],
  ["Interpretasikan","Ubah output matematika menjadi pernyataan yang bermakna dalam konteks."],
  ["Putuskan","Berikan rekomendasi bersyarat, bandingkan alternatif, dan jelaskan trade-off serta uncertainty."],
];
export function ReferencePage({ guideMode = false }: { guideMode?: boolean }) {
  const [query,setQuery]=useState("");
  return <div className="page"><PageHeader eyebrow={guideMode?"KERANGKA PEMODELAN":"REFERENSI MATEMATIKA"} title={guideMode?"Dari pertanyaan ke keputusan.":"Pahami hubungan, bukan hafalan."} description={guideMode?"Dua belas langkah yang menghubungkan dunia nyata dan model matematika.":"Rumus, satuan, dan contoh terkait seluruh 100 level."}><Button asChild variant="outline"><Link href={guideMode?"/reference/":"/guide/"}>{guideMode?"Referensi model":"Panduan pemodelan"}</Link></Button></PageHeader>
  {guideMode?<div className="grid-2">{guide.map(([title,text],i)=><section key={title} className="panel"><span className="band-number">{String(i+1).padStart(2,"0")}</span><h2 className="mt-3 mb-2">{title}</h2><p>{text}</p></section>)}</div>:<><div className="filter-bar"><label className="field grow"><span>Cari rumus atau topik</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Misalnya: rate, integral, matrix…"/></label><Link href="/topics/" className="text-link">Peta topik <ArrowRight size={15}/></Link></div><div className="grid-2">{formulas.filter(f=>`${f.topic} ${f.expression} ${f.units}`.toLowerCase().includes(query.toLowerCase())).map(f=><article className="panel" key={f.level}><span className="tag">Level {f.level}</span><h3 className="mt-3 mb-3">{f.topic}</h3><div className="formula">{f.expression}</div><p className="text-xs mt-3">Satuan output: {f.units.join(", ")}</p>{f.level===11&&<div className="my-3 overflow-auto" dangerouslySetInnerHTML={{__html:katex.renderToString("r=\\frac{T-C}{h-d/60}",{throwOnError:false,output:"htmlAndMathml"})}}/>}<Link href={`/question/?id=${f.exampleId}`} className="text-link mt-2">Lihat contoh dalam konteks <ArrowRight size={14}/></Link></article>)}</div></> }</div>;
}
export function AboutPage(){return <div className="page prose max-w-4xl"><PageHeader eyebrow="TENTANG MODELMATH" title="Belajar berpikir dengan matematika." description="Latihan mandiri untuk pelajar, mahasiswa, analis, engineer, dan siapa pun yang ingin memperkuat quantitative reasoning."/><section className="panel"><h2>Modeling before calculation</h2><p>ModelMath melatih formulasi masalah, perhitungan, validasi, dan pengambilan keputusan melalui 100 level dengan 5.000 soal.</p><h2>Progress milik perangkatmu</h2><p>Tidak ada akun, backend, API AI, atau telemetry wajib. Riwayat, scratchpad, dan rubrik tersimpan di browser ini. Data tidak otomatis berpindah ke perangkat lain; gunakan ekspor dan impor di Pengaturan.</p><p>Menghapus data browser atau reset progress akan menghapus data lokal. Konten latihan tetap tersedia dari paket aplikasi.</p><h2>Penilaian yang transparan</h2><p>Jawaban terstruktur memiliki pemeriksaan deterministik. Alasan terbuka dinilai sendiri menggunakan rubrik, dengan label terpisah. Skor gabungan untuk progression bukan verifikasi otomatis atas kualitas alasan tertulis.</p><h2>Asumsi dan data soal</h2><p>Bank reference memuat soal terbuka dengan parameter yang belum lengkap. Pengayaan dan model pembanding dinyatakan sebagai asumsi eksplisit, tidak dianggap fakta tambahan dari sumber.</p><h2>Belajar tanpa jaringan</h2><p>Setelah aplikasi dan konten level selesai dimuat, cache lokal memungkinkan latihan pada konten tersebut tanpa jaringan. Buka level lain saat terhubung untuk menyimpannya, atau unduh seluruh bank dari Pengaturan.</p><div className="row mt-6"><Button asChild><Link href="/learn/">Mulai belajar</Link></Button><Button asChild variant="outline"><Link href="/settings/">Data & pengaturan</Link></Button></div></section></div>}
