"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { cargoCreateSchema, cargoHaliSchema } from "@/lib/validation";
import { parseZod, fail, type ActionResult } from "@/lib/action-result";
import { parseDateInput } from "@/lib/format";
import { imageToDataUri } from "@/lib/uploads";

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
  const user = await requireUser();

  const parsed = parseZod(cargoCreateSchema, input);
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const data = parsed.data!;

  const tareheKuagiza = parseDateInput(data.tarehe_kuagiza);
  if (!tareheKuagiza) return fail("Tarehe ya kuagiza si sahihi.");
  const tareheKutarajiwa = data.tarehe_kutarajiwa ? parseDateInput(data.tarehe_kutarajiwa) : null;

  const jumlaGharama = data.bidhaa.reduce((sum, b) => sum + b.idadi * b.bei_kwa_kipande, 0);

  try {
    await prisma.cargo.create({
      data: {
        mtumiajiId: user.id,
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
  } catch {
    return fail("Imeshindikana kuongeza mzigo. Jaribu tena.");
  }

  revalidatePath("/cargo");
  return { success: true, message: `Mzigo kutoka "${data.jina_kampuni}" umeongezwa.` };
}

/** Replicates mzigo_update_hali.php – updates arrival status (+ notes). */
export async function updateCargoHaliAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = parseZod(cargoHaliSchema, {
    id: formData.get("id"),
    hali: formData.get("hali"),
    tarehe_kufika: formData.get("tarehe_kufika"),
    maelezo_fika: formData.get("maelezo_fika"),
  });
  if (!parsed.success) return { success: false, message: parsed.message, fieldErrors: parsed.fieldErrors };

  const { id, hali, tarehe_kufika, maelezo_fika } = parsed.data!;

  const cargo = await prisma.cargo.findFirst({
    where: { id, mtumiajiId: user.id },
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

  revalidatePath("/cargo");
  return { success: true, message: "Hali imesasishwa." };
}

/** Replicates mzigo_risiti_upload.php – stores receipt photo as data URI. */
export async function uploadRisitiAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const mzigoId = Number(formData.get("mzigo_id"));
  const file = formData.get("risiti") as File | null;

  if (!mzigoId || !file || file.size === 0) {
    return fail("Chagua picha ya risiti kwanza.");
  }

  const cargo = await prisma.cargo.findFirst({
    where: { id: mzigoId, mtumiajiId: user.id },
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

  revalidatePath("/cargo");
  return { success: true, message: "Risiti imepakiwa." };
}

/** Replicates mzigo_delete.php – deletes a cargo order (and its items). */
export async function deleteCargoAction(cargoId: number): Promise<ActionResult> {
  const user = await requireUser();

  const cargo = await prisma.cargo.findFirst({
    where: { id: cargoId, mtumiajiId: user.id },
  });
  if (!cargo) return fail("Mzigo haupatikani.");

  await prisma.$transaction([
    prisma.cargoItem.deleteMany({ where: { mzigoId: cargoId } }),
    prisma.cargo.delete({ where: { id: cargoId } }),
  ]);

  revalidatePath("/cargo");
  return { success: true, message: "Mzigo umefutwa." };
}