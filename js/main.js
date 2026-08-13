import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { createBackground } from "./background.js";

createBackground(document.querySelector("[data-background]"));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const mobileLayout = window.matchMedia("(max-width: 799px)").matches;

document.querySelectorAll(mobileLayout ? ".mobile-lines" : ".desktop-lines").forEach((group) => {
  group.removeAttribute("aria-hidden");
});

document.querySelectorAll(mobileLayout ? ".desktop-lines" : ".mobile-lines").forEach((group) => {
  group.setAttribute("aria-hidden", "true");
});

if (!reduceMotion) {
  const timeline = gsap.timeline({ delay: 0.12 });
  const activeLines = mobileLayout ? ".mobile-lines" : ".desktop-lines";

  timeline.from(`#intro-title ${activeLines} .reveal-line > span`, {
    autoAlpha: 0,
    yPercent: 115,
    duration: 1.05,
    stagger: 0.12,
    ease: "power4.out",
  });

  timeline.from(`.intro-copy ${activeLines} .reveal-line > span`, {
    autoAlpha: 0,
    yPercent: 115,
    duration: 0.8,
    stagger: 0.13,
    ease: "power3.out",
  }, ">-0.08");

  timeline.from(".portfolio-link", {
    autoAlpha: 0,
    yPercent: 115,
    duration: 0.78,
    ease: "power3.out",
  }, ">-0.28");

  timeline.from(".artist-link .reveal-line > span", {
    autoAlpha: 0,
    yPercent: 115,
    duration: 0.78,
    ease: "power3.out",
  }, ">-0.36");

  timeline.from(".contact a", {
    autoAlpha: 0,
    y: -10,
    duration: 0.65,
    stagger: 0.08,
    ease: "power2.out",
  }, ">-0.08");
}
