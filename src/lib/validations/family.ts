import { z } from "zod";

export const familyGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
});
export type FamilyGroupInput = z.infer<typeof familyGroupSchema>;

export const familyMemberInviteSchema = z.object({
  email: z.string().email("Enter a valid email"),
  role: z.enum(["partner", "member", "child"]).default("member"),
});
export type FamilyMemberInviteInput = z.infer<typeof familyMemberInviteSchema>;

export const familyMemberRoleSchema = z.object({
  role: z.enum(["owner", "partner", "member", "child"]),
});
export type FamilyMemberRoleInput = z.infer<typeof familyMemberRoleSchema>;
