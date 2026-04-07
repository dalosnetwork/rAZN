import z from "zod";

export const recentLeadSchema = z.object({
  id: z.string(),
  type: z.enum(["mint", "redeem"]),
  amount: z.number(),
  status: z.string(),
  source: z.string(),
  lastActivity: z.string(),
});
