"use client";

import Image from "next/image";
import { useRef } from "react";
import { Icon } from "../Icon";

export type Faculty = { name: string; src: string; width: number; height: number };

/** Native scroll-snap rail; the buttons are a convenience for mouse users. */
export function FacultyRail({ faculties }: { faculties: Faculty[] }) {
  const rail = useRef<HTMLUListElement>(null);
  const move = (direction: 1 | -1) => {
    const element = rail.current;
    if (!element) return;
    const card = element.querySelector("li");
    element.scrollBy({ left: direction * ((card?.clientWidth ?? 320) + 16), behavior: "smooth" });
  };

  return (
    <div className="sd-rail">
      <div className="sd-rail-controls">
        <button type="button" className="sd-round" aria-label="Khoa trước" onClick={() => move(-1)}>
          <Icon name="back" />
        </button>
        <button type="button" className="sd-round" aria-label="Khoa tiếp theo" onClick={() => move(1)}>
          <Icon name="arrow" />
        </button>
      </div>
      <ul ref={rail} className="sd-rail-track" aria-label="Các khoa đào tạo">
        {faculties.map((faculty) => (
          <li key={faculty.name}>
            <figure>
              <Image
                src={faculty.src}
                alt={faculty.name}
                width={faculty.width}
                height={faculty.height}
                sizes="(max-width: 767px) 80vw, 420px"
              />
            </figure>
          </li>
        ))}
      </ul>
    </div>
  );
}
