import Image from "next/image";

// Hand-drawn Nhà B1 (public/campus-drawing.webp). Static, so it also runs on edge runtimes without a filesystem.
export function CampusArt({ caption }: { caption?: string }) {
  return (
    <figure className="campus-frame">
      <Image
        src="/campus-drawing.webp"
        alt="Tranh vẽ Nhà B1, cơ sở 1 Trường Đại học Sao Đỏ"
        width={1448}
        height={1086}
        sizes="(max-width: 960px) 100vw, 50vw"
        priority
      />
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
