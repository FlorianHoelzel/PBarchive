import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sumof.best",
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
