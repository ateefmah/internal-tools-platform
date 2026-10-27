"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
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
    action: "persona.signed_in",
    entityType: "session",
    entityId: persona.id,
    detail: `mock SSO: signed in as ${persona.role}`,
  });
}

export async function signIn(formData: FormData) {
  await setPersona(String(formData.get("persona") ?? ""));
  redirect("/");
}

export async function signOut() {
  const jar = await cookies();
  jar.delete("persona");
  redirect("/sign-in");
}
