"use client";
import * as React from "react";

/**
 * Social media link. On Android phones a TikTok profile is opened in the TikTok app
 * (TikTok's mobile website hides a profile's videos and shows "no videos published").
 * If the app is not installed, Android falls back to the normal web link.
 */
export function SocialLink({ href, label, className, children }: { href: string; label: string; className?: string; children: React.ReactNode }) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!/Android/i.test(navigator.userAgent)) return;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      return;
    }
    if (!/(^|\.)tiktok\.com$/i.test(url.hostname)) return;
    e.preventDefault();
    // Android intent: whichever TikTok app is installed opens the profile; otherwise the browser opens the web page.
    const target = `${url.host}${url.pathname}${url.search}`;
    window.location.href = `intent://${target}#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;S.browser_fallback_url=${encodeURIComponent(url.toString())};end`;
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={className} onClick={onClick}>
      {children}
    </a>
  );
}
