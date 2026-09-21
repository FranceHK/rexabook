"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { businessIdFor, requireActiveBusinessRole } from "@/lib/auth";
import { cargoCreateSchema, cargoHaliSchema } from "@/lib/validation";
import { parseZod, fail, type ActionResult } from "@/lib/action-result";
import { parseDateInput } from "@/lib/format";
import { imageToDataUri } from "@/lib/uploads";
import { DASHBOARD_CACHE_TAG } from "@/lib/cache-tags";
import { writeAudit } from "@/lib/audit";

export interface CargoItemInput {
  jina_bidhaa: string;
  idadi: number;
  kitengo: string;
  bei_kwa_kipande: number;
}

export interface CargoCreateInput {
  jina_kampuni: string;
  aina_usafiri?: string;
  nambari_tracking?: string;
  tarehe_kuagiza: string;
  tarehe_kutarajiwa?: string;
  maelezo?: string;
  bidhaa: CargoItemInput[];
}

/** Replicates mzigo_add.php – creates a cargo order with its items. */
export async function createCargoAction(input: CargoCreateInput): Promise<ActionResult> {
  const user = await requireActiveBusinessRole(["OWNER", "MANAGER"]);
  const businessId = businessIdFor(user);

  const parsed = parseZod(cargoCreateSchema, input);
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const data = parsed.data!;

  const tareheKuagiza = parseDateInput(data.tarehe_kuagiza);
  if (!tareheKuagiza) return fail("Tarehe ya kuagiza si sahihi.");
  const tareheKutarajiwa = data.tarehe_kutarajiwa ? parseDateInput(data.tarehe_kutarajiwa) : null;

  const jumlaGharama = data.bidhaa.reduce((sum, b) => sum + b.idadi * b.bei_kwa_kipande, 0);

  try {
    const cargo = await prisma.cargo.create({
      data: {
        mtumiajiId: businessId,
        jinaKampuni: data.jina_kampuni,
        jumlaGharama,
        ainaUsafiri: data.aina_usafiri || null,
        nambariTracking: data.nambari_tracking || null,
        tareheKuagiza,
        tareheKutarajiwa,
        maelezo: data.maelezo || null,
        items: {
          create: data.bidhaa.map((b) => ({
            jinaBidhaa: b.jina_bidhaa,
            idadi: b.idadi,
            kitengo: b.kitengo,
            beiKwaKipande: b.bei_kwa_kipande,
            jumla: b.idadi * b.bei_kwa_kipande,
          })),
        },
      },
    });
    await writeAudit({ businessId, actorUserId: user.id, action: "CARGO_CREATED", entity: "Cargo", entityId: cargo.id, details: { supplier: data.jina_kampuni, total: jumlaGharama, items: data.bidhaa.length } });
  } catch {
    return fail("Imeshindikana kuongeza mzigo. Jaribu tena.");
  }

  revalidatePath("/cargo");
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  return { success: true, message: `Mzigo kutoka "${data.jina_kampuni}" umeongezwa.` };
}

/** Replicates mzigo_update_hali.php – updates arrival status (+ notes). */
export async function updateCargoHaliAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireActiveBusinessRole(["OWNER", "MANAGER"]);
  const businessId = businessIdFor(user);

  const parsed = parseZod(cargoHaliSchema, {
    id: formData.get("id"),
    hali: formData.get("hali"),
    tarehe_kufika: formData.get("tarehe_kufika"),
    maelezo_fika: formData.get("maelezo_fika"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { id, hali, tarehe_kufika, maelezo_fika } = parsed.data!;

  const cargo = await prisma.cargo.findFirst({
    where: { id, mtumiajiId: businessId },
  });
  if (!cargo) return fail("Mzigo haupatikani.");

  if (hali === "Imefika") {
    const tareheKufika = tarehe_kufika ? parseDateInput(tarehe_kufika) : new Date();
    const maelezoNew = (maelezo_fika || "").trim();

    const update: { hali: "Imefika"; tareheKufikaHalisi: Date; maelezo?: string } = {
      hali: "Imefika",
      tareheKufikaHalisi: tareheKufika ?? new Date(),
    };
    if (maelezoNew) {
      update.maelezo = cargo.maelezo ? `${cargo.maelezo}\n| ${maelezoNew}` : maelezoNew;
    }
    await prisma.cargo.update({ where: { id }, data: update });
  } else {
    await prisma.cargo.update({
      where: { id },
      data: { hali: "Haijafika", tareheKufikaHalisi: null },
    });
  }
  await writeAudit({ businessId, actorUserId: user.id, action: "CARGO_STATUS_UPDATED", entity: "Cargo", entityId: id, details: { status: hali } });

  revalidatePath("/cargo");
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  return { success: true, message: "Hali imesasishwa." };
}

/** Replicates mzigo_risiti_upload.php – stores receipt photo as data URI. */
export async function uploadRisitiAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireActiveBusinessRole(["OWNER", "MANAGER"]);
  const businessId = businessIdFor(user);

  const mzigoId = Number(formData.get("mzigo_id"));
  const file = formData.get("risiti") as File | null;

  if (!mzigoId || !file || file.size === 0) {
    return fail("Chagua picha ya risiti kwanza.");
  }

  const cargo = await prisma.cargo.findFirst({
    where: { id: mzigoId, mtumiajiId: businessId },
  });
  if (!cargo) return fail("Mzigo haupatikani.");

  let dataUri: string;
  try {
    dataUri = await imageToDataUri(file);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Picha si sahihi.");
  }

  await prisma.cargo.update({
    where: { id: mzigoId },
    data: { risitiPicha: dataUri },
  });
  await writeAudit({ businessId, actorUserId: user.id, action: "CARGO_RECEIPT_UPLOADED", entity: "Cargo", entityId: mzigoId });

  revalidatePath("/cargo");
  return { success: true, message: "Risiti imepakiwa." };
}

/** Marks a single cargo item (row) as arrived; the whole cargo becomes "Imefika" once every item has arrived. */
export async function markCargoItemArrivedAction(cargoItemId: number): Promise<ActionResult> {
  const user = await requireActiveBusinessRole(["OWNER", "MANAGER"]);
  const businessId = businessIdFor(user);

  const item = await prisma.cargoItem.findFirst({
    where: { id: cargoItemId, cargo: { mtumiajiId: businessId } },
    include: { cargo: { include: { items: true } } },
  });
  if (!item) return fail("Bidhaa haipatikani.");

  if (!item.imefika) {
    await prisma.cargoItem.update({ where: { id: cargoItemId }, data: { imefika: true } });
  }

  const zoteZimefika = item.cargo.items.length > 0 && item.cargo.items.every((i) => i.imefika || i.id === cargoItemId);

  if (zoteZimefika && item.cargo.hali !== "Imefika") {
    await prisma.cargo.update({
      where: { id: item.cargo.id },
      data: { hali: "Imefika", tareheKufikaHalisi: item.cargo.tareheKufikaHalisi ?? new Date() },
    });
  }
  await writeAudit({ businessId, actorUserId: user.id, action: "CARGO_ITEM_ARRIVED", entity: "CargoItem", entityId: cargoItemId, details: { cargoId: item.cargo.id, cargoComplete: zoteZimefika } });

  revalidatePath("/cargo");
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  return {
    success: true,
    message: zoteZimefika ? "Mzigo wote umefika! ✅" : "Bidhaa imewekwa kama imefika.",
  };
}

/** Replicates mzigo_delete.php – deletes a cargo order (and its items). */
export async function deleteCargoAction(cargoId: number): Promise<ActionResult> {
  const user = await requireActiveBusinessRole(["OWNER", "MANAGER"]);
  const businessId = businessIdFor(user);

  const cargo = await prisma.cargo.findFirst({
    where: { id: cargoId, mtumiajiId: businessId },
  });
  if (!cargo) return fail("Mzigo haupatikani.");

  await prisma.$transaction([
    prisma.cargoItem.deleteMany({ where: { mzigoId: cargoId } }),
    prisma.cargo.delete({ where: { id: cargoId } }),
  ]);
  await writeAudit({ businessId, actorUserId: user.id, action: "CARGO_DELETED", entity: "Cargo", entityId: cargoId, details: { supplier: cargo.jinaKampuni } });

  revalidatePath("/cargo");
  revalidatePath("/dashboard");
  revalidateTag(DASHBOARD_CACHE_TAG);
  return { success: true, message: "Mzigo umefutwa." };
}
