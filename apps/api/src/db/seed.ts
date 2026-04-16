import { footerContentDefaults, homepageContentDefaults, promptpayConfigDefaults } from "@cip/shared";

import bcrypt from "bcryptjs";

import { env } from "../config/env";
import { db } from "./index";
import {
  auditLogs,
  categories,
  inventoryItems,
  jobs,
  oauthAccounts,
  orderInputs,
  orderItems,
  orders,
  passwordResetOtps,
  paymentIntents,
  productVariants,
  products,
  providerConfigs,
  randomPools,
  sessions,
  siteContents,
  users,
  walletTransactions,
  webhookEvents
} from "./schema";
import { createId } from "../lib/ids";
import { encryptPayload } from "../lib/security";
import { now } from "../lib/time";

async function main() {
  await db.delete(auditLogs);
  await db.delete(jobs);
  await db.delete(webhookEvents);
  await db.delete(walletTransactions);
  await db.delete(paymentIntents);
  await db.delete(orderInputs);
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(randomPools);
  await db.delete(inventoryItems);
  await db.delete(productVariants);
  await db.delete(products);
  await db.delete(categories);
  await db.delete(passwordResetOtps);
  await db.delete(sessions);
  await db.delete(oauthAccounts);
  await db.delete(providerConfigs);
  await db.delete(siteContents);
  await db.delete(users);

  const timestamp = now();
  const categoryIds = {
    digital: createId(),
    topup: createId(),
    premium: createId(),
    random: createId()
  };

  await db.insert(categories).values([
    {
      id: categoryIds.digital,
      slug: "digital-goods",
      name: "โค้ดและลิงก์ดาวน์โหลด",
      description: "ขายโค้ดเกม, serial key และลิงก์ดาวน์โหลด",
      icon: "KeyRound",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: categoryIds.topup,
      slug: "game-topup",
      name: "เติมเกมอัตโนมัติ",
      description: "เชื่อมต่อ provider และ webhook สำหรับเติมเกม",
      icon: "Gamepad2",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: categoryIds.premium,
      slug: "premium-apps",
      name: "แอปพรีเมียมและ ID-PASS",
      description: "ขายแอปพรีเมียมและงาน pre-order แบบฟอร์ม",
      icon: "Crown",
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: categoryIds.random,
      slug: "random-items",
      name: "สุ่มและไอดีเกม",
      description: "สุ่มรางวัล ไอดีเกม และ item พร้อมส่ง",
      icon: "Sparkles",
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]);

  const productIds = {
    code: createId(),
    link: createId(),
    topup: createId(),
    premium: createId(),
    idPass: createId(),
    random: createId()
  };

  await db.insert(products).values([
    {
      id: productIds.code,
      categoryId: categoryIds.digital,
      slug: "valorant-60-point-code",
      name: "Valorant 60 Point Code",
      description: "รับโค้ดเกมทันทีหลังชำระด้วย Wallet",
      type: "DIGITAL_CODE",
      priceCents: 3900,
      compareAtCents: 4500,
      deliveryNote: "ระบบจะส่งโค้ดอัตโนมัติหลังชำระสำเร็จ",
      badge: "พร้อมส่ง",
      coverImage: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: productIds.link,
      categoryId: categoryIds.digital,
      slug: "offline-rpg-download-bundle",
      name: "Offline RPG Download Bundle",
      description: "ชุดลิงก์ดาวน์โหลดเกมอินดี้พร้อมคู่มือใช้งาน",
      type: "DOWNLOAD_LINK",
      priceCents: 14900,
      compareAtCents: null,
      deliveryNote: "ลิงก์ดาวน์โหลดถูกปลดล็อกทันที",
      badge: "Hot",
      coverImage: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: productIds.topup,
      categoryId: categoryIds.topup,
      slug: "free-fire-topup-530",
      name: "Free Fire เติมเพชร 530",
      description: "รองรับงานเติมเกมผ่าน provider และ webhook",
      type: "TOPUP_API",
      priceCents: 9900,
      compareAtCents: null,
      deliveryNote: "ใช้เวลา 1-5 นาทีหลังชำระสำเร็จ",
      badge: "Auto",
      coverImage: "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: productIds.premium,
      categoryId: categoryIds.premium,
      slug: "youtube-premium-1-month",
      name: "YouTube Premium 1 เดือน",
      description: "ระบบ premium API / manual review scaffold",
      type: "PREMIUM_API",
      priceCents: 7900,
      compareAtCents: null,
      deliveryNote: "ต้องกรอกอีเมลสำหรับรับสิทธิ์",
      badge: "Premium",
      coverImage: "https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: productIds.idPass,
      categoryId: categoryIds.premium,
      slug: "id-pass-preorder-pack",
      name: "บริการ ID-PASS เติมเกม",
      description: "ลูกค้ากรอก ID และ PASS ส่งเข้าหลังบ้าน",
      type: "ID_PASS_ORDER",
      priceCents: 5900,
      compareAtCents: null,
      deliveryNote: "เจ้าหน้าที่ตรวจและเติมให้ภายหลัง",
      badge: "Pre-order",
      coverImage: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: productIds.random,
      categoryId: categoryIds.random,
      slug: "mystery-account-box",
      name: "สุ่มไอดีเกม Mystery Box",
      description: "ระบบสุ่มไอดีเกมจาก stock จริง",
      type: "RANDOM_POOL",
      priceCents: 11900,
      compareAtCents: 15900,
      deliveryNote: "สุ่มแล้วรับสินค้าอัตโนมัติทันที",
      badge: "สุ่ม",
      coverImage: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]);

  const inventoryIdA = createId();
  const inventoryIdB = createId();
  const inventoryIdC = createId();
  const inventoryIdD = createId();

  await db.insert(inventoryItems).values([
    {
      id: inventoryIdA,
      productId: productIds.code,
      kind: "code",
      maskedLabel: "Code-VALO-****-001",
      encryptedPayload: encryptPayload("VALO-ABCD-EFGH-IJKL"),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    },
    {
      id: inventoryIdB,
      productId: productIds.link,
      kind: "download_link",
      maskedLabel: "Download Link #001",
      encryptedPayload: encryptPayload("https://download.example.com/rpg-bundle-001"),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    },
    {
      id: inventoryIdC,
      productId: productIds.random,
      kind: "account",
      maskedLabel: "Account Rank Gold",
      encryptedPayload: encryptPayload("user_gold@example.com / PassGold123"),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    },
    {
      id: inventoryIdD,
      productId: productIds.random,
      kind: "account",
      maskedLabel: "Account Rank Platinum",
      encryptedPayload: encryptPayload("user_plat@example.com / PassPlat123"),
      isAllocated: false,
      createdAt: timestamp,
      allocatedAt: null
    }
  ]);

  await db.insert(randomPools).values([
    { id: createId(), productId: productIds.random, inventoryItemId: inventoryIdC, weight: 1 },
    { id: createId(), productId: productIds.random, inventoryItemId: inventoryIdD, weight: 1 }
  ]);

  await db.insert(providerConfigs).values([
    {
      id: createId(),
      providerKey: "promptpay",
      isEnabled: true,
      configJson: JSON.stringify({
        ...promptpayConfigDefaults,
        instructions: "QR ตัวอย่างสำหรับ localhost กรุณาแก้เลขรับเงินจริงจากหลังบ้านก่อนเปิดใช้งานจริง"
      }),
      updatedAt: timestamp
    },
    { id: createId(), providerKey: "wepay", isEnabled: false, configJson: "{}", updatedAt: timestamp },
    { id: createId(), providerKey: "24payseller", isEnabled: false, configJson: "{}", updatedAt: timestamp },
    { id: createId(), providerKey: "peamsub24hr", isEnabled: false, configJson: "{}", updatedAt: timestamp },
    { id: createId(), providerKey: "kbiz", isEnabled: false, configJson: "{}", updatedAt: timestamp },
    { id: createId(), providerKey: "truemoney", isEnabled: false, configJson: "{}", updatedAt: timestamp },
    { id: createId(), providerKey: "rdcw", isEnabled: false, configJson: "{}", updatedAt: timestamp }
  ]);

  await db.insert(siteContents).values([
    {
      id: createId(),
      contentKey: "homepage",
      valueJson: JSON.stringify(homepageContentDefaults),
      updatedAt: timestamp
    },
    {
      id: createId(),
      contentKey: "footer",
      valueJson: JSON.stringify(footerContentDefaults),
      updatedAt: timestamp
    }
  ]);

  await db.insert(users).values([
    {
      id: createId(),
      email: env.adminEmail,
      passwordHash: await bcrypt.hash(env.adminPassword, 10),
      displayName: "ผู้ดูแลระบบ",
      role: "admin",
      walletBalanceCents: 500000,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: createId(),
      email: "demo@example.com",
      passwordHash: await bcrypt.hash("DemoPass123!", 10),
      displayName: "ลูกค้าทดสอบ",
      role: "customer",
      walletBalanceCents: 150000,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ]);

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => process.exit(0));
