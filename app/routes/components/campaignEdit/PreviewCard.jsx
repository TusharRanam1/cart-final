import { useState, useMemo, useEffect } from "react";
import {
  Card,
  Text,
  Icon,
  RangeSlider,
  Box,
  BlockStack,
} from "@shopify/polaris";
import { GiftCardIcon } from "@shopify/polaris-icons";
import { CURRENCY_SYMBOLS } from "../../utils/currencyHandler/mapCurrency";

export default function PreviewCard({
  goals = [],
  selected = "cart",
  defaultCurrency,
  content = {},
}) {
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
    [goals],
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
  const completedIndex = useMemo(() => {
    if (!sortedGoals.length) return -1;

    let index = -1;

    for (let i = 0; i < sortedGoals.length; i++) {
      if (current >= Number(sortedGoals[i].target)) {
        index = i;
      } else {
        break;
      }
    }

    return index;
  }, [current, sortedGoals]);

  // compute page index from milestone index
  const pageFromProgress = Math.max(0, Math.floor(completedIndex / 3));

  // switch pages automatically forward & backward
  useEffect(() => {
    if (sortedGoals.length > 3) {
      setCurrentPage(pageFromProgress);
    }
  }, [pageFromProgress, sortedGoals.length]);

  // slice goals for current page
  const pageGoals = sortedGoals.slice(currentPage * 3, currentPage * 3 + 3);

  const getDotPositions = (count, isLastPage, remaining) => {
    if (isLastPage) {
      if (remaining === 1) return [100];
      if (remaining === 2) return [10, 100];
      return [10, 55, 100];
    }

    if (count === 1) return [50];
    if (count === 2) return [10, 80];
    return [10, 45, 80];
  };

  // ------------------------------
  // PROGRESS BAR %
  // ------------------------------
  const progressPct = useMemo(() => {
    if (!pageGoals.length) return 0;

    const isLastPage = currentPage === totalPages - 1;
    const remaining = sortedGoals.length - currentPage * 3;

    const positions = getDotPositions(pageGoals.length, isLastPage, remaining);

    const targets = pageGoals.map((g) => Number(g.target));

    // BEFORE FIRST GOAL
    if (current < targets[0]) {
      return (current / targets[0]) * positions[0];
    }

    // BETWEEN GOALS
    for (let i = 0; i < targets.length - 1; i++) {
      const startTarget = targets[i];
      const endTarget = targets[i + 1];

      if (current >= startTarget && current < endTarget) {
        const rangeProgress =
          (current - startTarget) / (endTarget - startTarget);

        return positions[i] + rangeProgress * (positions[i + 1] - positions[i]);
      }
    }

    // AFTER LAST GOAL ON PAGE
    // AFTER LAST GOAL ON PAGE
    const lastTarget = targets[targets.length - 1];

    // AFTER LAST GOAL ON PAGE → allow smooth progress toward next milestone
    const globalLastIndex = currentPage * 3 + (targets.length - 1);
    const nextGoal = sortedGoals[globalLastIndex + 1];

    if (nextGoal) {
      const overflowProgress =
        (current - lastTarget) / (Number(nextGoal.target) - lastTarget);

      return (
        positions[positions.length - 1] +
        overflowProgress * (100 - positions[positions.length - 1])
      );
    }

    // FINAL PAGE → allow smooth progress to 100%
    if (current >= lastTarget) {
      return positions[positions.length - 1];
    }

    const overflowProgress = (current - lastTarget) / (maxTarget - lastTarget);

    return (
      positions[positions.length - 1] +
      overflowProgress * (100 - positions[positions.length - 1])
    );
  }, [current, pageGoals, currentPage, totalPages, sortedGoals.length]);

  const getGoalLabel = (goal) => {
    if (!goal) return "";

    if (goal.type === "free_product") return "Free Gift";
    if (goal.type === "free_shipping") return "Free Shipping";

    if (goal.type === "order_discount") {
      return goal.discountType === "percentage"
        ? `${goal.discountValue}% Off`
        : `${goal.discountValue} ${CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency} Off`;
    }

    return "";
  };

  const getOrdinalKey = (index) => {
    const num = index + 1;
    const suffix =
      num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";

    return `${num}${suffix} goal`;
  };

  const nextGoalIndex = sortedGoals.findIndex(
    (g) => Number(g.target) > current,
  );

  const nextGoal = nextGoalIndex !== -1 ? sortedGoals[nextGoalIndex] : null;

  const nextGoalKey =
    nextGoalIndex !== -1 ? getOrdinalKey(nextGoalIndex) : null;

  const amountText = nextGoal
    ? selected === "cart"
      ? `${nextGoal.target - current} ${CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency}`
      : `${nextGoal.target - current} `
    : "";

  const currentStatusText =
    selected === "cart"
      ? ` ${current} ${CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency}`
      : `${current} items`;

  const topGiftTitleBefore =
    nextGoalKey && content?.[nextGoalKey]?.giftTitleBefore;

  const discountText = (() => {
    if (!nextGoal) return "";

    if (nextGoal.type === "order_discount") {
      return nextGoal.discountType === "percentage"
        ? `${nextGoal.discountValue}%`
        : `${nextGoal.discountValue} ${CURRENCY_SYMBOLS[defaultCurrency] || defaultCurrency}`;
    }

    return topGiftTitleBefore || getGoalLabel(nextGoal);
  })();

  const goalUnitText = selected === "cart" ? "" : " more items";

  const defaultSentence = (
    <>
      Add <strong>{amountText}</strong> {goalUnitText} to unlock {discountText}
    </>
  );

  const userSentence =
    nextGoalKey && content?.[nextGoalKey]?.progressTextBefore;

  let renderedSentence = null;

  if (userSentence) {
    const parts = userSentence.split(
      /(\{\{goal\}\}|\{\{discount\}\}|\{\{current_status\}\})/g,
    );

    renderedSentence = parts.map((part, index) => {
      if (part === "{{goal}}") return <strong key={index}>{amountText}</strong>;

      if (part === "{{discount}}")
        return <strong key={index}>{discountText}</strong>;

      if (part === "{{current_status}}")
        return <strong key={index}>{currentStatusText}</strong>;

      return <span key={index}>{part}</span>;
    });
  }

  const renderTemplate = (template) => {
    if (!template) return null;

    const parts = template.split(
      /(\{\{goal\}\}|\{\{discount\}\}|\{\{current_status\}\})/g,
    );

    return parts.map((part, index) => {
      if (part === "{{goal}}") {
        return <span key={index}>{amountText}</span>;
      }

      if (part === "{{discount}}") {
        return <span key={index}>{discountText}</span>;
      }

      if (part === "{{current_status}}") {
        return <span key={index}>{currentStatusText}</span>;
      }

      return <span key={index}>{part}</span>;
    });
  };

  const finalGoal =
    sortedGoals.length > 0 ? sortedGoals[sortedGoals.length - 1] : null;

  const finalGoalKey = finalGoal ? getOrdinalKey(sortedGoals.length - 1) : null;

  const finalProgressText =
    finalGoalKey && content?.[finalGoalKey]?.progressTextAfter;

  const dotPositions = useMemo(() => {
    if (!pageGoals.length) return [];

    const isLastPage = currentPage === totalPages - 1;
    const remaining = sortedGoals.length - currentPage * 3;

    return getDotPositions(pageGoals.length, isLastPage, remaining);
  }, [pageGoals.length, currentPage, totalPages, sortedGoals.length]);

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
          <Text>{renderedSentence ? renderedSentence : defaultSentence}</Text>
        ) : (
          <Text>
            {" "}
            {finalProgressText
              ? renderTemplate(finalProgressText)
              : "🎉 All milestones unlocked!"}
          </Text>
        )}

        {/* ------------------- PROGRESS BAR (3 per page) ------------------- */}
        {pageGoals.length > 0 && (
          <div
            style={{
              marginTop: "1.5rem",
              width: "100%",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "6px",
                background: "#d3d3d3",
                borderRadius: "6px",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${progressPct}%`,
                  height: "100%",
                  background: "black",
                  borderRadius: "6px",
                  transition: "width 300ms ease",
                }}
              />

              {/* Dots for ONLY this page */}
              {pageGoals.map((g, i) => {
                const achieved = current >= Number(g.target);
                const x = dotPositions[i];

                return (
                  <div
                    key={g.id}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: `calc(${x}% - 10px)`,
                      transform: "translateY(-50%)",
                      width: "20px",
                      height: "20px",
                      borderRadius: "50%",
                      background: achieved ? "#000000" : "#fff",
                      border: achieved ? "2px solid #000000" : "2px solid #ccc",
                      display: "flex",
                      alignItems: "center",
                      color: achieved ? "#fff" : "#000",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "bold",
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
            position: "relative",
            height: "64px",
            minHeight: "64px",
            paddingBottom: "8px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }}
        >
          {pageGoals.map((goal, i) => {
            const achieved = current >= Number(goal.target);
            const x = dotPositions[i];
            const safeX = Math.min(Math.max(x, 5), 95);

            const globalIndex = sortedGoals.findIndex((g) => g.id === goal.id);
            const goalKey = getOrdinalKey(globalIndex);
            const beforeTitle = content?.[goalKey]?.giftTitleBefore;

            return (
              <div
                key={goal.id}
                style={{
                  position: "absolute",
                  left: `${safeX}%`,
                  transform: "translateX(-50%)",
                  width: "90px",
                  textAlign: "center",
                  overflow: "visible", // important
                  whiteSpace: "normal", // allow wrapping
                }}
              >
                <div
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto",
                  }}
                >
                  <Icon source={GiftCardIcon} tone="base" />
                </div>

                <Text fontWeight="medium">
                  {!achieved && beforeTitle
                    ? renderTemplate(beforeTitle)
                    : getGoalLabel(goal)}
                </Text>
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
              gap: "6px",
            }}
          >
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: currentPage === i ? "black" : "#d3d3d3",
                }}
              />
            ))}
          </div>
        )}
      </Box>

      {/* ------------------- SLIDER ------------------- */}
      <Box padding="400" borderTopWidth="1" borderColor="border-subdued">
        <BlockStack gap="300">
          <Text>Use this slider to simulate customer progress</Text>

          <RangeSlider
            min={0}
            max={maxTarget}
            value={selected === "cart" ? currentCartValue : currentCartQty}
            onChange={(value) => {
              if (selected === "cart") setCurrentCartValue(value);
              else setCurrentCartQty(value);
            }}
          />
        </BlockStack>
      </Box>
    </Card>
  );
}
