import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { FacultyRail, type Faculty } from "@/components/landing/FacultyRail";
import { FallingPetals } from "@/components/landing/FallingPetals";
import { phuongFonts } from "@/components/landing/fonts";
import { SceneArrival, SceneCurtain } from "@/components/landing/SceneTransition";
import { LandingMotion } from "@/components/landing/LandingMotion";
import {
  AnimatedWaveDivider,
  CountUpStat,
  GalleryLightbox,
  LikeBurstButton,
  ScrollDownCue,
  ScrollProgressAndBackToTop,
} from "@/components/landing/MotionPromptEffects";
import { PhuongDivider, PhuongFlower, PhuongTree } from "@/components/landing/Phuong";
import { aiConfig } from "@/lib/ai-provider";
import "./landing.css";

// Facts and photos come from the school's official website (saodo.edu.vn),
// collected 26/09/2026. See docs/design/nguon-anh-truong.md.

const stats = [
  { value: "1969", label: "Năm khởi đầu truyền thống đào tạo" },
  { value: "2010", label: "Năm trở thành trường đại học" },
  { value: "Gần 27 ha", label: "Hai cơ sở tại Hải Phòng" },
  { value: "988 m²", label: "Thư viện với hơn 4.000 đầu sách" },
];

const milestones = [
  { when: "1969", text: "Thành lập cơ sở đào tạo, khởi đầu truyền thống của trường." },
  { when: "24/03/2010", text: "Nâng cấp thành Trường Đại học Sao Đỏ theo Quyết định 376/QĐ-TTg." },
  { when: "05/09/2026", text: "Khai giảng năm học 2026-2027 tại hội trường nhà trường." },
  { when: "18/09/2026", text: "Thành lập Phân hiệu tại thành phố Hà Nội, trên cơ sở Trường Cao đẳng Kinh tế Công nghiệp Hà Nội." },
];

const faculties: Faculty[] = [
  { name: "Khoa Cơ khí", src: "/truong/khoa-co-khi.jpg", width: 1276, height: 872 },
  { name: "Khoa Công nghệ thông tin", src: "/truong/khoa-cntt.jpg", width: 1500, height: 894 },
  { name: "Khoa Điện", src: "/truong/khoa-dien.jpg", width: 945, height: 496 },
  { name: "Khoa Ô tô", src: "/truong/khoa-o-to.jpg", width: 600, height: 312 },
  { name: "Khoa Kinh tế", src: "/truong/khoa-kinh-te.jpg", width: 1488, height: 778 },
  { name: "Khoa Du lịch và Ngoại ngữ", src: "/truong/khoa-du-lich-ngoai-ngu.jpg", width: 1464, height: 764 },
  { name: "Khoa May và Thời trang", src: "/truong/khoa-may-thoi-trang.jpg", width: 1300, height: 890 },
];

const events = [
  { src: "/truong/su-kien-doanh-nghiep.jpg", alt: "Chương trình Doanh nghiệp đồng hành cùng sinh viên năm 2025" },
  { src: "/truong/su-kien-trao-thuong.jpg", alt: "Lễ trao thưởng sinh viên năm 2025" },
  { src: "/truong/su-kien-thanh-lich.jpg", alt: "Đêm chung kết Sinh viên thanh lịch năm 2025" },
];

const external = { target: "_blank", rel: "noopener noreferrer" } as const;

export default function WelcomePage() {
  const aiAvailable = aiConfig() !== null;

  return (
    <div className={`sd ${phuongFonts}`}>
      <LandingMotion />
      <ScrollProgressAndBackToTop />
      <GalleryLightbox />
      <SceneArrival />
      <SceneCurtain to="/login" />
      <FallingPetals />
      <header className="sd-nav">
        <Link href="/" className="sd-brand" aria-label="Trường Đại học Sao Đỏ, trang chủ">
          <Image src="/sao-do-logo.png" alt="" width={40} height={43} priority />
          <span>
            <strong>Đại học Sao Đỏ</strong>
            <small>Saodo University</small>
          </span>
        </Link>
        <nav aria-label="Điều hướng chính">
          <a href="#gioi-thieu">Giới thiệu</a>
          <a href="#dao-tao">Đào tạo</a>
          <a href="#doi-song">Đời sống</a>
          <a href="#lien-he">Liên hệ</a>
        </nav>
        <Link className="sd-btn sd-btn-primary sd-btn-sm" href="/login" data-magnetic>
          Đăng nhập
        </Link>
      </header>

      <main id="noi-dung">
        <section className="sd-hero" aria-labelledby="hero-title">
          <div className="sd-hero-copy">
            <p className="sd-kicker sd-rise">
              <PhuongFlower size={20} /> Trường đại học công lập thuộc Bộ Công Thương
            </p>
            <h1 id="hero-title" className="sd-rise sd-rise-2">
              Toàn diện. Sáng tạo. <em>Thích ứng.</em>
            </h1>
            <p className="sd-city sd-rise sd-rise-3">Giữa lòng Hải Phòng, Thành phố Hoa Phượng Đỏ</p>
            <p className="sd-lead sd-rise sd-rise-3">
              Đào tạo đa ngành gắn với thực tiễn, trên nền truyền thống bắt đầu từ năm 1969.
            </p>
            <div className="sd-actions sd-rise sd-rise-4">
              <a className="sd-btn sd-btn-primary" href="#gioi-thieu" data-magnetic>
                Khám phá trường <Icon name="arrow" />
              </a>
              <Link className="sd-btn sd-btn-ghost" href="/login" data-magnetic>
                Đăng nhập
              </Link>
            </div>
          </div>
          <div className="sd-hero-art sd-rise sd-rise-2">
            <PhuongTree className="sd-tree" />
            <figure className="sd-hero-photo" data-tilt data-tilt-max="6" data-lightbox>
              <div className="sd-hero-frame">
                <Image
                  src="/truong/nha-b1.jpg"
                  alt="Tòa nhà B1 của Trường Đại học Sao Đỏ dưới trời xanh"
                  width={1500}
                  height={1076}
                  sizes="(max-width: 1023px) 70vw, 32vw"
                  priority
                />
              </div>
              <figcaption>Nhà B1, cơ sở 1</figcaption>
            </figure>
          </div>
        </section>

        <ScrollDownCue targetId="gioi-thieu" />

        <section className="sd-stats" aria-label="Trường Đại học Sao Đỏ qua các con số">
          <dl>
            {stats.map((item) => (
              <div key={item.label} data-reveal data-tilt data-tilt-max="5" data-spotlight>
                <dt>{item.label}</dt>
                <dd>
                  <CountUpStat rawText={item.value} />
                </dd>
              </div>
            ))}
          </dl>
          <p>Số liệu do nhà trường công bố.</p>
        </section>

        <section className="sd-section sd-history" id="gioi-thieu" aria-labelledby="history-title">
          <figure className="sd-history-photo" data-reveal data-tilt data-tilt-max="5" data-lightbox>
            <Image
              src="/truong/khai-giang-hoi-truong.jpg"
              alt="Hội trường chật kín sinh viên trong lễ khai giảng năm học 2026-2027"
              width={1264}
              height={770}
              sizes="(max-width: 1023px) 100vw, 45vw"
            />
            <figcaption>Lễ khai giảng năm học 2026-2027</figcaption>
          </figure>
          <div>
            <p className="sd-eyebrow" data-reveal><PhuongFlower size={16} /> Giới thiệu</p>
            <h2 id="history-title" className="sd-h2" data-reveal>Hơn nửa thế kỷ <em data-highlight>đào tạo</em> cho công nghiệp.</h2>
            <p className="sd-body" data-reveal>
              Trường Đại học Sao Đỏ (mã trường SDU) định hướng <mark className="mp-highlight" data-highlight>đào tạo đa ngành gắn với ứng dụng thực tiễn</mark>, phát
              triển năng lực số, nghiên cứu và phục vụ cộng đồng.
            </p>
            <div className="sd-timeline">
              <span className="sd-timeline-line" aria-hidden="true" />
              <ol>
                {milestones.map((item) => (
                  <li key={item.when} data-reveal>
                    <PhuongFlower size={22} className="sd-timeline-flower" />
                    <time>{item.when}</time>
                    <p>{item.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="sd-city-band" aria-labelledby="city-title">
          <PhuongTree className="sd-band-tree" id="phuong-band" />
          <div data-reveal>
            <p className="sd-eyebrow"><PhuongFlower size={16} /> Hải Phòng</p>
            <h2 id="city-title">Mùa hè, cả thành phố <em data-highlight>rực đỏ sắc phượng.</em></h2>
            <p className="sd-body">
              Hoa phượng đỏ là biểu tượng của Hải Phòng, <mark className="mp-highlight" data-highlight>Thành phố Hoa Phượng Đỏ</mark>. Sắc phượng đầu hè gắn với mùa thi, mùa
              tốt nghiệp và những kỷ niệm tuổi sinh viên.
            </p>
          </div>
          <AnimatedWaveDivider fill="#fff4ea" />
        </section>

        <PhuongDivider />

        <section className="sd-section" id="dao-tao" aria-labelledby="faculty-title">
          <div className="sd-faculty-head">
            <div>
              <h2 id="faculty-title" className="sd-h2" data-reveal>Chọn ngành bạn thích, <em data-highlight>học để làm được việc.</em></h2>
              <p className="sd-body" data-reveal>
                Các lĩnh vực đào tạo gồm kỹ thuật, công nghệ thông tin, trí tuệ nhân tạo, kinh tế, luật, ngoại ngữ, du
                lịch và sư phạm.
              </p>
            </div>
            <a
              className="sd-btn sd-btn-ghost"
              href="https://saodo.edu.vn/vi/news/nganh-dao-tao/gioi-thieu-ve-cac-nganh-dao-tao-cua-truong-dai-hoc-sao-do-2698.html"
              {...external}
              data-magnetic
            >
              Xem các ngành <Icon name="arrow" />
            </a>
          </div>
          <div data-reveal>
            <FacultyRail faculties={faculties} />
          </div>
        </section>

        <section className="sd-section sd-practice" aria-labelledby="practice-title">
          <div className="sd-practice-text" data-reveal>
            <h2 id="practice-title" className="sd-h2">Học qua thực hành, <em data-highlight>trên máy thật.</em></h2>
            <p className="sd-body">
              Nhà trường có các trung tâm thực hành cơ khí, công nghệ thông tin, ô tô và điện. Năm 2025, sinh viên Khoa
              Cơ khí <mark className="mp-highlight" data-highlight>gia công sản phẩm cho doanh nghiệp</mark> ngay tại xưởng trường.
            </p>
          </div>
          <figure className="sd-mosaic-a" data-reveal data-lightbox>
            <Image src="/truong/thuc-hanh-01.jpg" alt="Giảng viên hướng dẫn sinh viên kiểm tra chi tiết gia công bên máy CNC" width={1500} height={1000} sizes="(max-width: 767px) 100vw, 40vw" />
          </figure>
          <figure className="sd-mosaic-b" data-reveal data-lightbox>
            <Image src="/truong/thuc-hanh-05.jpg" alt="Sinh viên vận hành bảng điều khiển máy tiện CNC" width={1500} height={1062} sizes="(max-width: 767px) 100vw, 30vw" />
          </figure>
          <figure className="sd-mosaic-c" data-reveal data-lightbox>
            <Image src="/truong/thuc-hanh-07.jpg" alt="Sinh viên đo kiểm sản phẩm bằng thước cặp điện tử" width={1500} height={985} sizes="(max-width: 767px) 100vw, 30vw" />
          </figure>
          <figure className="sd-mosaic-d" data-reveal data-lightbox>
            <Image src="/truong/thuc-hanh-02.jpg" alt="Nhóm sinh viên đọc bản vẽ kỹ thuật cạnh máy phay CNC" width={1500} height={1000} sizes="(max-width: 767px) 100vw, 40vw" />
          </figure>
        </section>

        <PhuongDivider />

        <section className="sd-section sd-life" id="doi-song" aria-labelledby="life-title">
          <div className="sd-life-text" data-reveal>
            <p className="sd-eyebrow"><PhuongFlower size={16} /> Đời sống sinh viên</p>
            <h2 id="life-title" className="sd-h2">Một nơi để đọc, <em data-highlight>học nhóm và gặp gỡ.</em></h2>
            <p className="sd-body">
              Thư viện rộng 988 m² với hơn 4.000 đầu sách, có khu cafe sách, bàn học nhóm và góc đọc yên tĩnh.
            </p>
          </div>
          <div className="sd-life-photos">
            <figure className="sd-life-main" data-reveal data-lightbox>
              <Image src="/truong/thu-vien-2.jpg" alt="Sinh viên học nhóm trên ghế sofa xanh trong thư viện" width={1000} height={659} sizes="(max-width: 767px) 100vw, 50vw" />
            </figure>
            <figure data-reveal data-lightbox>
              <Image src="/truong/thu-vien-1.jpg" alt="Nhóm sinh viên trao đổi bài quanh bàn tròn" width={1000} height={667} sizes="(max-width: 767px) 100vw, 25vw" />
            </figure>
            <figure data-reveal data-lightbox>
              <Image src="/truong/thu-vien-3.jpg" alt="Sinh viên chọn sách giữa các giá sách" width={960} height={640} sizes="(max-width: 767px) 100vw, 25vw" />
            </figure>
          </div>
          <p className="sd-note">Ảnh tư liệu thư viện năm 2021 · Nhấn vào ảnh bất kỳ để phóng to (Lightbox).</p>
        </section>

        <section className="sd-section sd-events" aria-labelledby="events-title">
          <h2 id="events-title" className="sd-h2" data-reveal>Những dấu ấn <em data-highlight>năm 2025.</em></h2>
          <div className="sd-events-grid">
            {events.map((item, index) => (
              <figure key={item.src} className={index === 0 ? "sd-event-wide" : undefined} data-reveal data-lightbox>
                <Image src={item.src} alt={item.alt} width={1500} height={555} sizes={index === 0 ? "100vw" : "(max-width: 767px) 100vw, 50vw"} />
              </figure>
            ))}
          </div>
        </section>

        <PhuongDivider />

        <section className="sd-section sd-news" aria-labelledby="news-title">
          <h2 id="news-title" className="sd-h2" data-reveal>Tin mới <em data-highlight>từ nhà trường.</em></h2>
          <div className="sd-news-grid">
            <div className="sd-news-card sd-news-accent" data-reveal data-tilt data-tilt-max="4">
              <div className="sd-news-card-top">
                <time>20/09/2026</time>
                <LikeBurstButton initialCount={128} storageKey="sdu-like-hanoi-campus" />
              </div>
              <h3>Thành lập Phân hiệu Trường Đại học Sao Đỏ tại Hà Nội</h3>
              <p>Dấu mốc mới trên hành trình phát triển của nhà trường.</p>
              <a
                className="sd-link"
                href="https://saodo.edu.vn/vi/news/tin-tuc-su-kien/thanh-lap-phan-hieu-truong-dai-hoc-sao-do-tai-ha-noi-dau-moc-moi-tren-hanh-trinh-phat-trien-2959.html"
                {...external}
              >
                Đọc trên saodo.edu.vn <Icon name="arrow" />
              </a>
            </div>
            <div className="sd-news-card sd-news-photo" data-reveal data-tilt data-tilt-max="4" data-spotlight>
              <Image src="/truong/khai-giang-sinh-vien.jpg" alt="Tân sinh viên dự lễ khai giảng" width={1173} height={793} sizes="(max-width: 767px) 100vw, 50vw" />
              <div>
                <div className="sd-news-card-top">
                  <time>05/09/2026</time>
                  <LikeBurstButton initialCount={256} storageKey="sdu-like-khai-giang" />
                </div>
                <h3>Tưng bừng khai giảng năm học 2026-2027</h3>
                <a
                  className="sd-link"
                  href="https://saodo.edu.vn/vi/news/tin-tuc-su-kien/truong-dai-hoc-sao-do-tung-bung-khai-giang-nam-hoc-2026-2027-2953.html"
                  {...external}
                >
                  Đọc trên saodo.edu.vn <Icon name="arrow" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="sd-portal" aria-labelledby="portal-title">
          <div data-reveal>
            <h2 id="portal-title">Đang là sinh viên Sao Đỏ?</h2>
            <p>
              {aiAvailable
                ? "Vào cổng học tập để xem lớp học, hạn nộp bài và học cùng trợ lý AI."
                : "Vào cổng học tập để xem lớp học, hạn nộp bài và phản hồi của giảng viên."}
            </p>
          </div>
          <div className="sd-actions" data-reveal>
            <Link className="sd-btn sd-btn-light" href="/login" data-magnetic>
              Đăng nhập <Icon name="arrow" />
            </Link>
            <Link className="sd-btn sd-btn-outline-light" href="/guest" data-magnetic>
              Xem bản demo
            </Link>
          </div>
          <AnimatedWaveDivider fill="rgba(255, 241, 235, 0.25)" />
        </section>
      </main>

      <footer className="sd-footer" id="lien-he">
        <div className="sd-footer-top">
          <div className="sd-footer-brand">
            <Image src="/sao-do-logo.png" alt="" width={56} height={60} />
            <p>
              <strong>Trường Đại học Sao Đỏ</strong>
              <span className="sd-footer-motto">Toàn diện - Sáng tạo - Thích ứng</span>
            </p>
          </div>
          <address className="sd-contact">
            <div>
              <h2>Cơ sở 1</h2>
              <p>Số 76 Nguyễn Thị Duệ, Thái Học 2, phường Chu Văn An, thành phố Hải Phòng</p>
            </div>
            <div>
              <h2>Cơ sở 2</h2>
              <p>Km 78, đường Nguyễn Thái Học (Quốc lộ 37), phường Chu Văn An, thành phố Hải Phòng</p>
            </div>
            <div>
              <h2>Liên hệ</h2>
              <p>
                <a href="tel:+842203882269">(0220) 3882 269</a>
                <a href="mailto:info@saodo.edu.vn">info@saodo.edu.vn</a>
                <a href="https://saodo.edu.vn/" {...external}>saodo.edu.vn</a>
              </p>
            </div>
          </address>
        </div>
        <div className="sd-footer-bottom">
          <span>© 2026 Trường Đại học Sao Đỏ</span>
          <span>Ảnh và thông tin: website chính thức saodo.edu.vn</span>
        </div>
      </footer>
    </div>
  );
}
