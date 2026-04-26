import { expect, request, test } from "@playwright/test";

const apiBaseUrl = "http://127.0.0.1:3001";
const adminEmail = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL ?? "admin@example.com";
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

test("public UI loads in a real browser", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle(/CIP/i);
  await expect(page.locator("body")).toContainText("CIP");
});

test("login, topup, order, provider callback, refund", async () => {
  const api = await request.newContext({ baseURL: apiBaseUrl });

  const login = await api.post("/api/auth/login", {
    data: {
      email: adminEmail,
      password: adminPassword
    }
  });
  expect(login.ok()).toBeTruthy();

  const topup = await api.post("/api/wallet/topup-intents", {
    data: {
      amountBaht: 2500,
      method: "promptpay_qr"
    }
  });
  expect(topup.ok()).toBeTruthy();
  const topupBody = (await topup.json()) as { paymentIntentId: string };

  const settleTopup = await api.post(`/api/dev/settle-payment/${topupBody.paymentIntentId}`, { data: {} });
  expect(settleTopup.ok()).toBeTruthy();

  const catalog = await api.get("/api/catalog");
  expect(catalog.ok()).toBeTruthy();
  const categories = (await catalog.json()) as Array<{ products: Array<{ id: string; priceCents: number }> }>;
  const product = categories.flatMap((category) => category.products).find((item) => item.priceCents > 0);
  expect(product).toBeTruthy();

  const order = await api.post("/api/orders", {
    data: {
      productId: product!.id,
      quantity: 1,
      paymentMethod: "wallet",
      formInput: {}
    }
  });
  expect(order.ok()).toBeTruthy();
  const orderBody = (await order.json()) as { orderId: string };

  const providerCallback = await api.post("/api/webhooks/wepay/order-update", {
    data: {
      orderId: orderBody.orderId,
      providerOrderId: `e2e-${Date.now()}`,
      status: "success",
      deliveryPayload: "E2E delivery payload"
    }
  });
  expect(providerCallback.ok()).toBeTruthy();

  const refund = await api.post(`/api/admin/orders/${orderBody.orderId}/refund`, {
    data: {
      note: "E2E refund"
    }
  });
  expect(refund.ok()).toBeTruthy();
  const refundBody = (await refund.json()) as { status: string };
  expect(refundBody.status).toBe("refunded");

  await api.dispose();
});
