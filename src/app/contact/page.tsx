import { PageHeader } from "@/components/common/page-header";
import { profileData } from "@/constants/portfolio-data";

const cardClassName =
  "group flex items-center justify-between gap-16 p-24 border border-white/10 rounded-lg hover:border-white/30 transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-white";

export default function ContactPage() {
  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="say hello" />

      {/* Description */}
      <section className="w-full max-w-content mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-full md:w-3/4 break-keep">
            채용이나 협업 제안은 이메일로 보내 주세요. 작업 기록은 GitHub에서
            확인하실 수 있습니다.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="space-y-48">
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-32">
            <li>
              <a href={`mailto:${profileData.email}`} className={cardClassName}>
                <div className="space-y-4 min-w-0">
                  <p className="text-small opacity-50">email</p>
                  <p className="text-lg md:text-2xl break-all group-hover:opacity-70 transition-opacity">
                    {profileData.email}
                  </p>
                </div>
                <span aria-hidden="true" className="opacity-50">
                  →
                </span>
              </a>
            </li>
            <li>
              <a
                href={profileData.github}
                target="_blank"
                rel="noopener noreferrer"
                className={cardClassName}
              >
                <div className="space-y-4 min-w-0">
                  <p className="text-small opacity-50">github</p>
                  <p className="text-lg md:text-2xl break-all group-hover:opacity-70 transition-opacity">
                    {profileData.github.replace("https://", "")}
                  </p>
                </div>
                <span aria-hidden="true" className="opacity-50">
                  ↗
                </span>
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          </ul>

          <div className="flex justify-end">
            <div className="w-36 h-36 opacity-50">
              <svg
                aria-hidden="true"
                viewBox="0 0 36 36"
                fill="none"
                className="w-full h-full"
              >
                <circle cx="18" cy="18" r="18" fill="currentColor" />
              </svg>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
