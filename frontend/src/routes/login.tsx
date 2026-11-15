import { createFileRoute } from "@tanstack/react-router";
import { AuthCard } from "@/components/AuthCard";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — Volt Bridge" },
      { name: "description", content: "Log in to your Volt Bridge household energy plan." },
      { property: "og:title", content: "Log in — Volt Bridge" },
      { property: "og:description", content: "Access your daily solar and battery plan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <AuthCard mode="login" />,
});
