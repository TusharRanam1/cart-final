import prisma from "../db.server";

export async function upsertStoreInfo(shop) {
  const now = new Date();

  await prisma.storeInfo.upsert({
    where: {
      storeId: shop,
    },
    create: {
      storeId: shop,
      firstInstalledAt: now,
      lastInstalledAt: now,
      trialUsed: false,
    },
    update: {
      lastInstalledAt: now,
    },
  });
}
