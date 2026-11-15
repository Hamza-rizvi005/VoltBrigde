import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Create account — Volt Bridge" },
      { name: "description", content: "Create a Volt Bridge account and set up your home's solar energy plan." },
      { property: "og:title", content: "Create account — Volt Bridge" },
      { property: "og:description", content: "Start planning your solar, battery and power-cut backup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthCard mode="register" />,
});
