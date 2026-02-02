import { json } from "@remix-run/node";
import { runRenewExpieredPlan } from "./jobs/renewExpiredPlan.cron";
import { runUpgradePlan } from "./jobs/upgradePlan.cron";
import { flushOrdersToDBHourlyManual } from "./jobs/orderBulckFlush.cron";

/* ---------- SHARED HANDLER ---------- */

async function runJob(request) {
  const url = new URL(request.url);
  const job = url.searchParams.get("secret");

  switch (job) {
    case "1":
      await runRenewExpieredPlan();
      break;

    case "2":
      await runUpgradePlan();
      break;

    case "3":
      await flushOrdersToDBHourlyManual();
      break;

    default:
      return json({ error: "Invalid job specified" }, { status: 400 });
  }

  return json({ status: "OK", job });
}

/* ---------- GET (browser) ---------- */
export const loader = async ({ request }) => {
  return runJob(request);
};

/* ---------- POST (curl / server) ---------- */
export const action = async ({ request }) => {
  return runJob(request);
};
