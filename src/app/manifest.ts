import type { MetadataRoute } from "next";

// Powers the "Add to Home Screen" install prompt/icon on mobile — the
// primary way a shop owner would actually launch this app day-to-day.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tara Shop",
    short_name: "Tara",
    description: "Sổ bán hàng cho Tara Shop",
    start_url: "/",
    display: "standalone",
    background_color: "#EDEDF2",
    theme_color: "#BD4D41",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
