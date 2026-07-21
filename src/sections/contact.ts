import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const FORMSPREE_ID = import.meta.env.VITE_FORMSPREE_ID as string | undefined;

export function initContact() {
  gsap.registerPlugin(ScrollTrigger);

  const heading = document.querySelector<HTMLElement>(".contact .reveal-text");
  if (heading) {
    ScrollTrigger.create({
      trigger: heading,
      start: "top 85%",
      end: "bottom 50%",
      scrub: 1,
      onUpdate: (self) => {
        const clipValue = Math.max(0, 100 - self.progress * 100);
        heading.style.setProperty("--clip-value", `${clipValue}%`);
      },
    });
  }

  const form = document.getElementById("contact-form") as HTMLFormElement | null;
  const submitBtn = document.getElementById("contact-submit") as HTMLButtonElement | null;
  const status = document.getElementById("contact-status");
  if (!form || !submitBtn || !status) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!FORMSPREE_ID) {
      status.textContent =
        "Form isn't wired up yet — set VITE_FORMSPREE_ID in .env.local (see README).";
      status.classList.add("is-error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    status.textContent = "";
    status.classList.remove("is-error");

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (res.ok) {
        status.textContent = "Thanks — your message is in. I'll reply soon.";
        form.reset();
      } else {
        status.textContent = "Something went wrong sending that — try again, or email directly.";
        status.classList.add("is-error");
      }
    } catch {
      status.textContent = "Something went wrong sending that — try again, or email directly.";
      status.classList.add("is-error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send message";
    }
  });
}
