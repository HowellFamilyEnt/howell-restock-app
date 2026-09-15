"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function readTemplateFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const currency_code = String(formData.get("currency_code") ?? "").trim();
  const price = String(formData.get("price") ?? "").trim();
  const price_for_extra_person = String(formData.get("price_for_extra_person") ?? "").trim();
  const guestsIncludedRaw = String(formData.get("guests_included") ?? "").trim();
  const cleaning_fee = String(formData.get("cleaning_fee") ?? "").trim();
  const refundable_damage_deposit = String(formData.get("refundable_damage_deposit") ?? "").trim();
  const cancellation_policy = String(formData.get("cancellation_policy") ?? "").trim();
  const check_in_time_start = String(formData.get("check_in_time_start") ?? "").trim();
  const check_in_time_end = String(formData.get("check_in_time_end") ?? "").trim();
  const check_out_time = String(formData.get("check_out_time") ?? "").trim();
  const minNightsRaw = String(formData.get("min_nights") ?? "").trim();
  const maxNightsRaw = String(formData.get("max_nights") ?? "").trim();
  const instant_bookable = formData.get("instant_bookable") === "on";
  const house_rules = String(formData.get("house_rules") ?? "").trim();
  const description_template = String(formData.get("description_template") ?? "").trim();
  const amenity_ids = formData
    .getAll("amenity_ids")
    .map((v) => Number(v))
    .filter((n) => Number.isFinite(n));

  if (!name) throw new Error("Template name is required.");

  return {
    name,
    currency_code: currency_code || null,
    price: price || null,
    price_for_extra_person: price_for_extra_person || null,
    guests_included: guestsIncludedRaw ? Number(guestsIncludedRaw) : null,
    cleaning_fee: cleaning_fee || null,
    refundable_damage_deposit: refundable_damage_deposit || null,
    cancellation_policy: cancellation_policy || null,
    check_in_time_start: check_in_time_start || null,
    check_in_time_end: check_in_time_end || null,
    check_out_time: check_out_time || null,
    min_nights: minNightsRaw ? Number(minNightsRaw) : null,
    max_nights: maxNightsRaw ? Number(maxNightsRaw) : null,
    instant_bookable,
    house_rules: house_rules || null,
    description_template: description_template || null,
    amenity_ids,
  };
}

export async function createTemplate(formData: FormData) {
  const template = await prisma.listingTemplate.create({ data: readTemplateFields(formData) });
  revalidatePath("/templates");
  redirect(`/templates/${template.id}`);
}

export async function updateTemplate(templateId: string, formData: FormData) {
  await prisma.listingTemplate.update({
    where: { id: templateId },
    data: readTemplateFields(formData),
  });
  revalidatePath("/templates");
  revalidatePath(`/templates/${templateId}`);
}

export async function deleteTemplate(templateId: string) {
  await prisma.listingTemplate.delete({ where: { id: templateId } });
  revalidatePath("/templates");
  redirect("/templates");
}
