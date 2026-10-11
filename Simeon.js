"use strict";

document.documentElement.classList.add("js");

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
        menuToggle.setAttribute("aria-expanded", String(!isOpen));
        navLinks.classList.toggle("is-open", !isOpen);
    });

    navLinks.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("a")) {
            menuToggle.setAttribute("aria-expanded", "false");
            navLinks.classList.remove("is-open");
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            menuToggle.setAttribute("aria-expanded", "false");
            navLinks.classList.remove("is-open");
            menuToggle.focus();
        }
    });
}

const filterButtons = document.querySelectorAll(".filter-button");
const projects = document.querySelectorAll(".project-card");
const filterEmpty = document.querySelector(".filter-empty");

filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const filter = button.dataset.filter;
        let visibleCount = 0;

        filterButtons.forEach((item) => {
            const isActive = item === button;
            item.classList.toggle("is-active", isActive);
            item.setAttribute("aria-pressed", String(isActive));
        });

        projects.forEach((project) => {
            const isVisible = filter === "all" || project.dataset.category === filter;
            project.hidden = !isVisible;
            if (isVisible) visibleCount += 1;
        });

        if (filterEmpty) filterEmpty.hidden = visibleCount !== 0;
    });
});

const revealItems = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    revealItems.forEach((item) => revealObserver.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

const contactForm = document.querySelector("#contact-form");
const formStatus = document.querySelector("#form-status");
const submitButton = contactForm?.querySelector('button[type="submit"]');

if (contactForm && formStatus && submitButton) {
    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        formStatus.classList.remove("is-error", "is-success");
        formStatus.textContent = "Sending your note...";
        submitButton.disabled = true;

        try {
            const formData = new FormData(contactForm);
            const response = await fetch("/api/contact", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(Object.fromEntries(formData.entries()))
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.error || "Your note could not be sent.");

            formStatus.textContent = result.message;
            formStatus.classList.add("is-success");
            contactForm.reset();
        } catch (error) {
            formStatus.textContent = error instanceof Error
                ? error.message
                : "Something went wrong. Please try again.";
            formStatus.classList.add("is-error");
        } finally {
            submitButton.disabled = false;
        }
    });
}
