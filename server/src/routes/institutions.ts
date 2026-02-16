import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { SearchInstitutionsResponse } from "@openfinance/shared";
import { type AuthEnv } from "$lib/middleware";
import { institutionRegistryService } from "$lib/institution-registry.service";

const searchQuerySchema = z.object({
  query: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  provider: z.string().optional(),
  accountType: z.string().optional(),
});

const topQuerySchema = z.object({
  country: z.string().optional(),
  limit: z.coerce.number().int().positive().optional(),
  accountType: z.string().optional(),
});

const institutionRoutes = new Hono<AuthEnv>();

// GET /api/institutions/search?query=&limit=&provider=&accountType=
institutionRoutes.get(
  "/search",
  zValidator("query", searchQuerySchema),
  async (c) => {
    const q = c.req.valid("query");
    const result = await institutionRegistryService.searchInstitutions(q);
    const response: SearchInstitutionsResponse = { institutions: result };
    return c.json(response);
  },
);

// GET /api/institutions/top?country=&limit=&accountType=
institutionRoutes.get(
  "/top",
  zValidator("query", topQuerySchema),
  async (c) => {
    const q = c.req.valid("query");
    const result = await institutionRegistryService.getTopInstitutions(q);
    const response: SearchInstitutionsResponse = { institutions: result };
    return c.json(response);
  },
);

export default institutionRoutes;
