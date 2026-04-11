import React from "react";
import { Link } from "wouter";
import { MapIcon, MessageCircle, Phone } from "lucide-react";
import { FaWhatsapp, FaFacebook, FaInstagram } from "react-icons/fa";
import { motion } from "framer-motion";

const SOCIAL_LINKS = [
  {
    href: "https://whatsapp.com/channel/0029VaFurLDD8SE2bbOUxy1L",
    icon: FaWhatsapp,
    label: "WhatsApp",
    hoverColor: "hover:text-[#25D366]",
    hoverBg: "hover:bg-[#25D366]/10 hover:border-[#25D366]/30",
  },
  {
    href: "https://www.facebook.com/share/1V5BSGKY4x/",
    icon: FaFacebook,
    label: "Facebook",
    hoverColor: "hover:text-[#1877F2]",
    hoverBg: "hover:bg-[#1877F2]/10 hover:border-[#1877F2]/30",
  },
  {
    href: "https://www.instagram.com/ehtisham_nazeer?igsh=M3RoMzN5eTNqbXZu",
    icon: FaInstagram,
    label: "Instagram",
    hoverColor: "hover:text-[#E4405F]",
    hoverBg: "hover:bg-[#E4405F]/10 hover:border-[#E4405F]/30",
  },
];

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#0d0d0d] mt-auto">
      <div className="container max-w-screen-2xl px-4 md:px-8 py-10 md:py-14 pb-28 md:pb-14">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 items-start">

          {/* LEFT — Brand + Copyright */}
          <div className="flex flex-col gap-3">
            <Link href="/" className="flex items-center gap-2.5 group w-fit">
              <div className="bg-primary/15 p-2 rounded-xl border border-primary/20 group-hover:bg-primary/25 transition-colors">
                <MapIcon className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg tracking-tight group-hover:text-primary transition-colors">
                CraftLand <span className="text-primary">Hub</span>
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
              The premier destination for Free Fire CraftLand creators and players.
            </p>
            <div className="pt-1">
              <p className="text-sm font-semibold text-foreground/80">© Ehtisham Nazeer</p>
              <p className="text-xs text-muted-foreground">All Rights Reserved</p>
            </div>
          </div>

          {/* CENTER — Customer Support */}
          <div className="flex flex-col items-start md:items-center gap-3">
            <div className="flex items-center gap-2 mb-1">
              <Phone className="h-4 w-4 text-primary" />
              <h3 className="font-bold text-sm uppercase tracking-widest text-primary">Customer Support</h3>
            </div>
            <a
              href="https://wa.me/+923001234567?text=Hello%2C%20I%20need%20support%20for%20CraftLand%20Hub"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-primary/10 hover:border-primary/30 transition-all duration-200"
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">Contact Us</span>
            </a>
            <div className="flex flex-col items-start md:items-center gap-1 mt-2 text-xs text-muted-foreground">
              <Link href="/contact" className="hover:text-primary transition-colors">Send a Message</Link>
              <Link href="/terms" className="hover:text-primary transition-colors">Terms of Use</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            </div>
          </div>

          {/* RIGHT — Social Links */}
          <div className="flex flex-col items-start md:items-end gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Follow Us</p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map(({ href, icon: Icon, label, hoverColor, hoverBg }) => (
                <motion.a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  whileHover={{ scale: 1.12, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className={`flex items-center justify-center w-10 h-10 rounded-xl border border-white/8 bg-white/3 text-muted-foreground ${hoverColor} ${hoverBg} transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </motion.a>
              ))}
            </div>
            <div className="flex flex-col items-start md:items-end gap-1 mt-2 text-xs text-muted-foreground">
              <Link href="/copyright" className="hover:text-primary transition-colors">Copyright Disclaimer</Link>
              <Link href="/explore" className="hover:text-primary transition-colors">Explore Maps</Link>
              <Link href="/join-creator" className="hover:text-primary transition-colors">Join as Creator</Link>
            </div>
          </div>

        </div>

        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <p>Made with ❤️ for the Free Fire Community</p>
          <p>CraftLand Hub is not affiliated with Garena or 111dots Studio.</p>
        </div>
      </div>
    </footer>
  );
}
