import { gsap } from "https://cdn.jsdelivr.net/npm/gsap@3.13.0/index.js";
import { createBackground } from "./background.js";

createBackground(document.querySelector("[data-background]"));

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!reduceMotion) {
  const timeline = gsap.timeline({ delay: 0.12 });

  timeline.from("#intro-title .reveal-line > span", {
    autoAlpha: 0,
    yPercent: 115,
    duration: 1.05,
    stagger: 0.12,
    ease: "power4.out",
  });

  timeline.from(".intro-copy .reveal-line > span", {
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
