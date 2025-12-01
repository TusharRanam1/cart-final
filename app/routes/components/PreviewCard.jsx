import { useState, useMemo, useRef, useEffect } from "react";
import {
  Card,
  Text,
  Icon,
  RangeSlider,
  Box
} from "@shopify/polaris";
import { GiftCardIcon } from "@shopify/polaris-icons";

export default function PreviewCard({ goals = [], selected = "cart" }) {
  // ------------------------------
  // INTERNAL STATE
  // ------------------------------
  const [currentCartValue, setCurrentCartValue] = useState(300);
  const [currentCartQty, setCurrentCartQty] = useState(2);

  const current = selected === "cart" ? currentCartValue : currentCartQty;

  // ------------------------------
  // SORT GOALS
  // ------------------------------
  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => Number(a.target) - Number(b.target)),
    [goals]
  );

  const maxTarget = sortedGoals.length
    ? Number(sortedGoals[sortedGoals.length - 1].target)
    : 100;

  // ------------------------------
  // PAGE LOGIC (STATIC GROUP OF 3)
  // ------------------------------
  const totalPages = Math.ceil(sortedGoals.length / 3);
  const [currentPage, setCurrentPage] = useState(0);

  // find active milestone index based on progress
// find active milestone index based on progress
let activeIndex = 0;

if (sortedGoals.length > 0) {
  const idx = sortedGoals.findIndex((g) => current < Number(g.target));
  activeIndex = idx === -1 ? sortedGoals.length - 1 : idx - 1;

  // Final safety rule: do not read last.goal.target unless it exists
  if (current >= Number(sortedGoals[sortedGoals.length - 1].target)) {
    activeIndex = sortedGoals.length - 1;
  }
}


const safeIndex = Math.max(activeIndex, 0);

// compute page index from milestone index
const pageFromProgress = Math.floor(safeIndex / 3);


  // switch pages automatically forward & backward
  useEffect(() => {
    if (sortedGoals.length > 3) {
      setCurrentPage(pageFromProgress);
    }
  }, [pageFromProgress, sortedGoals.length]);

  // slice goals for current page
  const pageGoals = sortedGoals.slice(currentPage * 3, currentPage * 3 + 3);

  // ------------------------------
  // PROGRESS BAR %
  // ------------------------------
  const progressPct = useMemo(() => {
  if (!pageGoals.length) return 0;

  let targets = pageGoals
    .map((g) => Number(g.target))
    .filter((t) => !isNaN(t));

  if (targets.length === 0) return 0;

  const min = targets[0];
  const max = targets[targets.length - 1];

  // FIX 1: If min == max → only ONE goal in this page
  if (min === max) {
    // 1-goal page: bar fills based on overall progress
    return Math.min((current / max) * 100, 100);
  }

  // FIX 2: If min == 0 → avoid division by zero
  if (min === 0) {
    return Math.min((current / max) * 100, 100);
  }

  // NORMAL BEHAVIOR
  if (current >= max) return 100;
  if (current <= min) return (current / min) * 10;

  return ((current - min) / (max - min)) * 100;
}, [current, pageGoals]);


  // ------------------------------
  // LABEL LOGIC
  // ------------------------------
  const nextGoal = sortedGoals.find((g) => Number(g.target) > current);

  const getGoalLabel = (goal) => {
    if (goal.type === "free_product") return "Free Gift";
    if (goal.type === "free_shipping") return "Free Shipping";
    if (goal.type === "order_discount") {
      return goal.discountType === "percentage"
        ? `${goal.discountValue}% Off`
        : `₹${goal.discountValue} Off`;
    }
    return "";
  };

  return (
    <Card>
      <Box padding="400">
        <Text variant="headingSm" fontWeight="bold">
          Preview
        </Text>
      </Box>

      <Box padding="400">
        {/* ------------------- TEXT ------------------- */}
        {goals.length === 0 ? (
          <Text>Add at least 1 milestone to see preview</Text>
        ) : nextGoal ? (
          <Text>
            Add{" "}
            <strong>
              {selected === "cart"
                ? `₹${nextGoal.target - current}`
                : `${nextGoal.target - current} more items`}
            </strong>{" "}
            to unlock <strong>{getGoalLabel(nextGoal)}</strong>
          </Text>
        ) : (
          <Text>🎉Congratulations! All milestones unlocked!</Text>
        )}

        {/* ------------------- PROGRESS BAR (3 per page) ------------------- */}
        {pageGoals.length > 0 && (
          <div
            style={{
              marginTop: "1.5rem",
              width: "100%",
              position: "relative"
            }}
          >
            <div
              style={{
                height: "6px",
                background: "#d3d3d3",
                borderRadius: "6px",
                position: "relative"
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "black",
                  borderRadius: "6px",
                  transition: "width 300ms ease"
                }}
              />

              {/* Dots for ONLY this page */}
  {pageGoals.map((g, i) => {
  const achieved = current >= Number(g.target);

  const isGlobalLast = g === sortedGoals[sortedGoals.length - 1];
  const remaining = sortedGoals.length - currentPage * 3;
  const isLastPage = currentPage === totalPages - 1;

  let paddedX;

  if (isLastPage) {
    // ---------- LAST PAGE LOGIC ----------
    if (remaining === 1) {
      // Only last goal → must be 100%
      paddedX = 100;

    } else if (remaining === 2) {
      // Two remaining → 10% and 100%
      paddedX = i === 0 ? 10 : 100;

    } else {
      // Three remaining → 10%, 50%, 100%
      paddedX = i === 0 ? 10 : i === 1 ? 55 : 100;
    }

  } else {
    // ---------- NORMAL PAGE LOGIC ----------
    if (pageGoals.length === 1) {
      paddedX = 50;

    } else if (pageGoals.length === 2) {
      paddedX = i === 0 ? 10 : 80;

    } else {
      // Three goals in middle pages → 10% → 45% → 80%
      const positions = [10, 45, 80];
      paddedX = positions[i];
    }
  }

  return (
    <div
      key={g.id}
      style={{
        position: "absolute",
        top: "50%",
        left: `calc(${paddedX}% - 10px)`,
        transform: "translateY(-50%)",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: achieved ? "#000" : "#fff",
        border: achieved ? "2px solid #000" : "2px solid #ccc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: achieved ? "#fff" : "#000",
        fontSize: "12px",
        fontWeight: "bold"
      }}
    >
      {achieved ? "✔" : ""}
    </div>
  );
})}




            </div>
          </div>
        )}

        {/* ------------------- ICONS CAROUSEL (3 per page) ------------------- */}
        <div
          style={{
            marginTop: "1rem",
            display: "flex",
            justifyContent: "space-between",
            gap: "20px"
          }}
        >
          {pageGoals.map((goal) => {
            const achieved = current >= Number(goal.target);

            return (
              <div
                key={goal.id}
                style={{
                  width: "90px",
                  textAlign: "center"
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    // background: achieved ? "black" : "#e5e5e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto"
                  }}
                >
<Icon source={GiftCardIcon} tone="base" />
                </div>

                <Text>{getGoalLabel(goal)}</Text>
                <Text tone="subdued">Target: {goal.target}</Text>
              </div>
            );
          })}
        </div>

        {/* ------------------- PAGINATION DOTS ------------------- */}
        {totalPages > 1 && (
          <div
            style={{
              marginTop: "8px",
              display: "flex",
              justifyContent: "center",
              gap: "6px"
            }}
          >
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: currentPage === i ? "black" : "#d3d3d3"
                }}
              />
            ))}
          </div>
        )}

      </Box>

      {/* ------------------- SLIDER ------------------- */}
      <Box padding="400" borderTopWidth="1" borderColor="border-subdued">
        <Text>Use this slider to simulate customer progress</Text>

        <RangeSlider
          min={0}
          max={maxTarget}
          value={selected === "cart" ? currentCartValue : currentCartQty}
          onChange={(value) => {
            if (selected === "cart") setCurrentCartValue(value);
            else setCurrentCartQty(value);
          }}
          output
        />
      </Box>
    </Card>
  );
}
