"use client";

import Link from "next/link";

export function Footer() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { name: "Twitter", href: "https://twitter.com/stfnco" },
    { name: "Instagram", href: "https://instagram.com/stfnco" },
    { name: "LinkedIn", href: "https://linkedin.com/in/stfnco" },
    { name: "GitHub", href: "https://github.com/stfnco" },
  ];

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "Projects", href: "/projects" },
    { name: "About", href: "/about" },
    { name: "Blog", href: "/blog" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <footer className="w-full max-w-[1920px] mx-auto container-padding py-24 md:py-32 bg-black">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
        {/* Brand */}
        <div className="space-y-4">
          <h3 className="text-2xl font-medium">Nick</h3>
          <p className="text-small opacity-50">
            Product design partner focused on creating meaningful digital experiences
          </p>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          <h4 className="text-small font-medium">Navigation</h4>
          <ul className="space-y-2">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-small opacity-50 hover:opacity-100 transition-opacity"
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div className="space-y-4">
          <h4 className="text-small font-medium">Connect</h4>
          <ul className="space-y-2">
            {socialLinks.map((link) => (
              <li key={link.name}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-small opacity-50 hover:opacity-100 transition-opacity"
                >
                  {link.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-white/10">
        <p className="text-small opacity-50 text-center">
          © {currentYear} Nick. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
