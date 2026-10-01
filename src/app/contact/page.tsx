"use client";

import { useState } from "react";
import { PageHeader } from "@/components/common/page-header";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    // Add form submission logic here
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const socialLinks = [
    { platform: "twitter", handle: "@stfnco", icon: "TwitterLogo" },
    { platform: "instagram", handle: "@stfnco", icon: "InstagramLogo" },
    { platform: "tiktok", handle: "@stfnco", icon: "TiktokLogo" },
    { platform: "youtube", handle: "@stfnco", icon: "YoutubeLogo" },
  ];

  return (
    <div className="w-full min-h-screen bg-black text-white">
      {/* Hero Section */}
      <PageHeader title="say hello" />

      {/* Description */}
      <section className="w-full max-w-content mx-auto container-padding">
        <div className="flex justify-center">
          <p className="text-h2 text-center w-3/4">
            let&apos;s collaborate. feel free to drop me a line about your
            project or follow me on social networks
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="w-full max-w-content mx-auto container-padding section-spacing">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-48 md:gap-64">
          {/* Contact Form */}
          <div className="lg:col-span-7">
            <form onSubmit={handleSubmit} className="space-y-32 md:space-y-36">
              <div>
                <label htmlFor="name" className="block text-small mb-12">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-24 py-16 bg-transparent border border-white/25 rounded focus:border-white/50 focus:outline-none transition-colors text-base"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-small mb-12">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-24 py-16 bg-transparent border border-white/25 rounded focus:border-white/50 focus:outline-none transition-colors text-base"
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-small mb-12">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={8}
                  className="w-full px-24 py-16 bg-transparent border border-white/25 rounded focus:border-white/50 focus:outline-none transition-colors text-base resize-none"
                  placeholder="Tell me about your project..."
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center justify-center px-32 py-16 text-base font-light bg-white text-black hover:bg-white/90 rounded-full border border-white/25 transition-colors duration-300"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Spacer */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Social Links */}
          <div className="lg:col-span-4">
            <div className="flex flex-col justify-between h-full">
              <div className="space-y-32 md:space-y-48">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={`https://${social.platform}.com/${social.handle.slice(1)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-24 border border-white/10 rounded-lg hover:border-white/30 transition-colors duration-300"
                  >
                    <div className="space-y-4">
                      <p className="text-small opacity-50 capitalize">
                        {social.platform}
                      </p>
                      <p className="text-lg group-hover:opacity-70 transition-opacity">
                        {social.handle}
                      </p>
                    </div>
                    <div className="w-24 h-24 opacity-50 group-hover:opacity-100 transition-opacity">
                      →
                    </div>
                  </a>
                ))}
              </div>

              <div className="flex justify-end mt-48">
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
          </div>
        </div>
      </section>
    </div>
  );
}
