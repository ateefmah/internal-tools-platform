"use server";

import { cookies } from "next/headers";
import { personaById } from "../personas";
import { db } from "../db";
import { audit } from "../audit";

export async function setPersona(id: string) {
  const persona = personaById(id);
  if (!persona) return;
  const jar = await cookies();
  jar.set("persona", persona.id, { path: "/" });
  audit.record(db, {
    actor: persona.name,
    action: "persona.switched",
    entityType: "session",
    entityId: persona.id,
    detail: `mock SSO: now acting as ${persona.role}`,
  });
}
