import { defineCollection, z } from 'astro:content';

const sitesCollection = defineCollection({
  schema: z.object({
    name: z.string(),
    type: z.enum(['drop-off', 'pick-up', 'both']),
    category: z.string(),
    address: z.string(),
    city: z.string(),
    zip: z.string(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    phone: z.string().optional(),
    hours: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

export const collections = {
  sites: sitesCollection,
};


