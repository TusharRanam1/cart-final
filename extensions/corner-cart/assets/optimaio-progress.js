/* =========================================================================
   OPTIMAIO PROGRESS BAR — REUSES BXGY SCRIPT (NO NEW FETCH)
   IMPORTANT: load AFTER bxgy.js
========================================================================= */

console.log("📊 Optimaio Progress Bar Loaded (using BXGY shared data)");

/* ------------------------------------------
   WAIT FOR BXGY SCRIPT TO BE READY
------------------------------------------ */
function waitForBxgy() {
  return new Promise(resolve => {
    const check = () => {
      if (typeof parseCampaignData === "function" && typeof getCart === "function") {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}

/* ------------------------------------------
   ICONS FOR TIERS
------------------------------------------ */
function tierIcon(type) {
  switch (type) {
    case "free_shipping": return "🚚";
    case "order_discount": return "💸";
    case "free_product": return "🎁";
    default: return "⭐";
  }
}

/* ------------------------------------------
   PROGRESS BAR CALCULATION
------------------------------------------ */
function calculateProgress(campaign, cart) {
  if (!campaign || !cart) return null;

  const subtotal = cart.items.reduce((sum, item) => sum + item.final_line_price, 0) / 100;
  const quantity = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  const trackValue = campaign.trackType === "cart" ? subtotal : quantity;

  const goals = campaign.goals.map((goal, i) => {
    const unlocked = trackValue >= goal.target;
    const remaining = unlocked ? 0 : goal.target - trackValue;

    const content = campaign.content?.[`${i + 1}st goal`] || {};

    return {
      id: goal.id,
      target: goal.target,
      type: goal.type,
      unlocked,
      remaining,
      percent: Math.min((trackValue / goal.target) * 100, 100),
      title: unlocked ? (content.giftTitleAfter || "") : (content.giftTitleBefore || "")
    };
  });

  return {
    campaign,
    goals,
    trackValue,
    nextGoal: goals.find(g => !g.unlocked)
  };
}

/* ------------------------------------------
   RENDER UI
------------------------------------------ */
function renderProgress(progress) {
  let container = document.getElementById("optimaio-progress-container");

  if (!container) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div id="optimaio-progress-container" style="margin:20px 0;"></div>`
    );
    container = document.getElementById("optimaio-progress-container");
  }

  if (!progress) {
    container.innerHTML = "";
    return;
  }

  const allUnlocked = progress.goals.every(g => g.unlocked);

  const msg = allUnlocked
    ? "You have unlocked all rewards!"
    : `Add ₹${progress.nextGoal.remaining} more to unlock ${progress.nextGoal.title}`;

  const maxTarget = progress.goals[progress.goals.length - 1].target;
  const fillPercent = Math.min(progress.trackValue / maxTarget * 100, 100);

  let html = `
    <style>
      .opt-bar { height:8px;background:#ddd;border-radius:10px;position:relative;margin-bottom:30px; }
      .opt-fill { height:100%;background:#000;border-radius:10px;transition:width .3s; }
      .tier { position:absolute;top:-18px;transform:translateX(-50%);width:60px;text-align:center; }
      .tier-icon { width:30px;height:30px;border-radius:50%;border:2px solid #000;background:#fff;display:flex;justify-content:center;align-items:center;margin:auto; }
      .tier.unlocked .tier-icon { background:#000;color:#fff; }
      .tier-label { font-size:12px;margin-top:3px; }
      .opt-msg { font-weight:600;text-align:center;margin-bottom:10px;font-size:16px; }
    </style>

    <div class="opt-msg">${msg}</div>

    <div class="opt-bar">
      <div class="opt-fill" style="width:${fillPercent}%"></div>
  `;

  progress.goals.forEach(goal => {
    const pos = (goal.target / maxTarget) * 100;

    html += `
      <div class="tier ${goal.unlocked ? "unlocked" : ""}" style="left:${pos}%;">
        <div class="tier-icon">${tierIcon(goal.type)}</div>
        <div class="tier-label">${goal.title}</div>
      </div>
    `;
  });

  html += `</div>`;

  container.innerHTML = html;
}

/* ------------------------------------------
   MAIN REFRESH FUNCTION (NO FETCHING)
------------------------------------------ */
async function refreshProgress() {
  const campaignData = await parseCampaignData(); // From BXGY script
  const active = (campaignData?.campaigns || [])
    .filter(c => c.status === "active")
    .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0];

  if (!active) return renderProgress(null);

  const cart = await getCart(true); // From BXGY script

  const progress = calculateProgress(active, cart);
  renderProgress(progress);
}

/* ------------------------------------------
   LISTEN TO BXGY CART UPDATES
------------------------------------------ */
document.addEventListener("optimaio:cart:refresh", refreshProgress);

/* ------------------------------------------
   INITIAL LOAD
------------------------------------------ */
(async () => {
  await waitForBxgy();
  refreshProgress();
})();
