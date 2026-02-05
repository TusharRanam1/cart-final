import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { log } from "./logger/logger.server";
import { withRequestContext } from "./logger/requestContext.server";
import { getRequestId } from "./logger/requestId.server";

/* ------------------ Helper: Save metafield ------------------ */
async function setMetafield(admin, shopId, key, valueObj) {
  const mutation = `
    mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        metafields { id namespace key type value }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    metafields: [
      {
        namespace: "optimaio_cart",
        key,
        type: "json",
        ownerId: shopId,
        value: JSON.stringify(valueObj),
      },
    ],
  };

  const res = await admin.graphql(mutation, { variables });
  const data = await res.json();

  const errors = data?.data?.metafieldsSet?.userErrors;
  if (errors?.length) {
    log.error("Cart settings metafield save failed", {
      event: "cart.settings.save.failed",
      shopId,
      errors,
    });
  } else {
    log.info("Cart settings metafield saved", {
      event: "cart.settings.save.success",
      shopId,
      metafieldId: data?.data?.metafieldsSet?.metafields?.[0]?.id,
    });
  }

  return data;
}

/* ------------------ SAVE CART SETTINGS ROUTE ------------------ */
export const action = async ({ request }) => {
  const requestId = getRequestId(request);

  return withRequestContext({ requestId }, async () => {
    try {
      log.info("Save cart settings request received", {
        event: "cart.settings.save.received",
      });

      const { admin, session } = await authenticate.admin(request);
      const shop = session.shop;
      const body = await request.json();

      // 1️⃣ Fetch shop ID
      const shopRes = await admin.graphql(`{ shop { id } }`);
      const shopData = await shopRes.json();
      const shopId = shopData?.data?.shop?.id;

      if (!shopId) {
        log.error("Shop ID not resolved for cart settings save", {
          event: "cart.settings.shop_missing",
          shop,
        });

        return json({ ok: false, error: "Shop not found" }, { status: 500 });
      }

      // 2️⃣ Fetch existing cart_settings metafield
      const existingRes = await admin.graphql(`
        query {
          shop {
            metafield(namespace: "optimaio_cart", key: "cart_settings") {
              value
            }
          }
        }
      `);

      const existingJson = await existingRes.json();

      let existingSettings = {};
      const rawValue = existingJson?.data?.shop?.metafield?.value;

      if (rawValue) {
        try {
          existingSettings = JSON.parse(rawValue);
        } catch (err) {
          log.warn("Failed to parse existing cart settings", {
            event: "cart.settings.parse_failed",
            shop,
            rawValue,
          });
        }
      }

      // 3️⃣ Merge settings
      let mergedSettings = {
        ...existingSettings,
        theme: body.selectedTheme ?? existingSettings.theme,
        customCSS: body.customCSS ?? existingSettings.customCSS,
        customJS: body.customJS ?? existingSettings.customJS,
        zIndex: body.zIndex ?? existingSettings.zIndex,
        announcementBar:
          body.announcementBar ?? existingSettings.announcementBar,
        cartFeatures: body.cartFeatures ?? existingSettings.cartFeatures,
        cartWidget: body.cartWidget ?? existingSettings.cartWidget,
        cartTexts: body.cartTexts ?? existingSettings.cartTexts,
      };

      if (mergedSettings.announcementBar?.messages) {
        mergedSettings.announcementBar.messages =
          mergedSettings.announcementBar.messages.filter(
            (m) => typeof m === "string" && m.trim() !== "",
          );
      }

      // 🔥 Theme change → reset dependent config
      if (body.themeChanged) {
        log.info("Theme changed — resetting bannerStyle & colors", {
          event: "cart.settings.theme_changed",
          shop,
          newTheme: body.selectedTheme,
        });

        delete mergedSettings.bannerStyle;
        delete mergedSettings.colors;
      } else {
        mergedSettings.bannerStyle =
          body.bannerStyle ?? existingSettings.bannerStyle;

        mergedSettings.colors = {
          ...existingSettings.colors,
          ...body.colors,
        };
      }

      log.info("Saving merged cart settings", {
        event: "cart.settings.save.start",
        shop,
        theme: mergedSettings.theme,
        themeChanged: !!body.themeChanged,
      });

      // 4️⃣ Save metafield
      await setMetafield(admin, shopId, "cart_settings", mergedSettings);

      log.info("Cart settings saved successfully", {
        event: "cart.settings.save.completed",
        shop,
      });

      return json({ ok: true, saved: mergedSettings });
    } catch (err) {
      log.error("Save cart settings failed", {
        event: "cart.settings.save.exception",
        error: err,
      });

      return json(
        { ok: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  });
};
