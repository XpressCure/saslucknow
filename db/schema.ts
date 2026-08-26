import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const nextHumanVolunteerInquiries = sqliteTable("next_human_volunteer_inquiries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  reference: text("reference").notNull().unique(),
  status: text("status").notNull().default("new"),
  fullName: text("full_name").notNull(),
  ageRange: text("age_range").notNull(),
  city: text("city").notNull(),
  mobile: text("mobile").notNull(),
  email: text("email").notNull(),
  professionOrInstitution: text("profession_or_institution").notNull(),
  primaryContributionArea: text("primary_contribution_area").notNull(),
  source: text("source").notNull().default("website"),
  payload: text("payload").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
