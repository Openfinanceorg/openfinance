import { Hono } from "hono";
import type { SearchInstitutionsResponse } from "@shared/types";
import { type AuthEnv } from "$lib/middleware";
import { institutionRegistryService } from "$lib/institutionRegistry.service";

const institutionRoutes = new Hono<AuthEnv>();

// GET /api/institutions/search?query=&limit=&provider=&accountType=
institutionRoutes.get("/search", async (c) => {
  const result = await institutionRegistryService.searchInstitutions({
    query: c.req.query("query"),
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined,
    provider: c.req.query("provider"),
    accountType: c.req.query("accountType"),
  });

  const response: SearchInstitutionsResponse = { institutions: result };
  return c.json(response);
});

// GET /api/institutions/top?country=&limit=&accountType=
institutionRoutes.get("/top", async (c) => {
  const result = await institutionRegistryService.getTopInstitutions({
    country: c.req.query("country"),
    limit: c.req.query("limit") ? parseInt(c.req.query("limit")!) : undefined,
    accountType: c.req.query("accountType"),
  });

  const response: SearchInstitutionsResponse = { institutions: result };
  return c.json(response);
});

export default institutionRoutes;
